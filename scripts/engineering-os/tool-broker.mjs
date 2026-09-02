import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint, getAgent } from './runtime.mjs';
import { createApprovalLedger } from './approval-ledger.mjs';
import { createAuditLedger } from './audit-ledger.mjs';
import { createIdempotencyStore } from './idempotency-store.mjs';
import { createLockManager } from './lock-manager.mjs';
import { decideOperation } from './policy-engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const toolRegistry = JSON.parse(fs.readFileSync(path.join(root, 'engineering-os/registry/tools.json'), 'utf8'));
const riskRank = { low: 1, medium: 2, high: 3, critical: 4 };

export const getTool = (toolId) => {
  const tool = toolRegistry.tools.find((candidate) => candidate.id === toolId);
  if (!tool) throw new Error(`Unknown tool: ${toolId}`);
  return tool;
};

export const createToolBroker = ({
  adapters = {},
  audit = createAuditLedger(),
  approvals = null,
  locks = createLockManager(),
  idempotency = createIdempotencyStore(),
  budgetStore = null,
  maxRisk = 'critical',
  maxCalls = 100,
  maxTotalDurationMs = 1800000
} = {}) => {
  const approvalLedger = approvals ?? createApprovalLedger({ audit });
  let calls = 0;
  let totalDurationMs = 0;

  const checkRisk = (tool) => {
    if ((riskRank[tool.risk] ?? Infinity) > (riskRank[maxRisk] ?? 0)) throw new Error(`Tool risk exceeds broker ceiling: ${tool.id}`);
  };

  const reserveBudget = (runId) => {
    if (budgetStore) return budgetStore.reserve({ runId, maxCalls, maxTotalDurationMs });
    if (calls >= maxCalls) throw new Error('Tool call budget exhausted');
    if (totalDurationMs >= maxTotalDurationMs) throw new Error('Tool duration budget exhausted');
    calls += 1;
    return { runId, calls, totalDurationMs, maxCalls, maxTotalDurationMs };
  };

  const recordDuration = (runId, durationMs) => {
    if (budgetStore) return budgetStore.recordDuration({ runId, durationMs });
    totalDurationMs += durationMs;
    return { runId, calls, totalDurationMs, maxCalls, maxTotalDurationMs };
  };

  return {
    audit,
    approvals: approvalLedger,
    locks,
    idempotency,
    budgetStore,

    async execute({ runId, agentId, toolId, operation = toolId, input = {}, resource = null, idempotencyKey = null }) {
      if (!runId || !agentId || !toolId || !operation) throw new Error('Tool call missing required fields');
      const tool = getTool(toolId);
      const agent = getAgent(agentId);
      checkRisk(tool);

      const decision = decideOperation({
        agentId,
        scope: tool.scope,
        operation,
        runId,
        approvalLedger,
        toolId,
        forceApproval: tool.approval === 'required'
      });
      if (!decision.allowed) throw new Error(`Tool authorization denied: ${decision.reason}`);
      if (!agent.allowedScopes.includes(tool.scope)) throw new Error(`Agent lacks tool scope: ${agentId}/${tool.scope}`);
      if (tool.lock && !resource) throw new Error(`Tool requires a locked resource: ${toolId}`);
      if (tool.sideEffect !== 'none' && tool.idempotent && !idempotencyKey) throw new Error(`Idempotency key required: ${toolId}`);

      const request = { runId, agentId, toolId, operation, input, resource };
      let idempotencyReserved = false;
      if (idempotencyKey) {
        const reservation = idempotency.reserve({ key: idempotencyKey, request });
        if (reservation.replay) {
          audit.append({ type: 'tool.replayed', actor: agentId, runId, payload: { toolId, operation, idempotencyKey } });
          return { ...structuredClone(reservation.result), replayed: true };
        }
        if (reservation.pending) throw new Error(`Idempotent operation already in progress: ${idempotencyKey}`);
        idempotencyReserved = true;
      }

      let budget;
      try {
        budget = reserveBudget(runId);
      } catch (error) {
        if (idempotencyReserved) idempotency.fail({ key: idempotencyKey });
        throw error;
      }
      audit.append({ type: 'tool.budget-reserved', actor: agentId, runId, payload: { toolId, calls: budget.calls, maxCalls: budget.maxCalls } });

      let lock = null;
      const startedAt = Date.now();
      const callFingerprint = fingerprint(request);
      try {
        if (tool.lock) lock = locks.acquire({ resource, owner: `${runId}:${agentId}`, ttlMs: Math.max(tool.timeoutMs + 5000, 10000) });
        if (decision.approvalId) {
          approvalLedger.consume({ approvalId: decision.approvalId, runId, scope: tool.scope, operation, toolId, actor: agentId });
        }

        audit.append({ type: 'tool.started', actor: agentId, runId, payload: { toolId, operation, resource, callFingerprint, risk: tool.risk } });
        const adapter = adapters[toolId];
        if (typeof adapter !== 'function') throw new Error(`No adapter registered for tool: ${toolId}`);

        const controller = new AbortController();
        let timer;
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            const error = new Error(`Tool timeout: ${toolId}`);
            error.code = 'TOOL_TIMEOUT';
            reject(error);
          }, tool.timeoutMs);
        });

        let result;
        try {
          result = await Promise.race([
            Promise.resolve(adapter({ runId, agentId, operation, input: structuredClone(input), resource, callFingerprint, signal: controller.signal })),
            timeout
          ]);
        } finally {
          clearTimeout(timer);
        }

        const durationMs = Date.now() - startedAt;
        const response = { ok: true, toolId, operation, callFingerprint, durationMs, result };
        if (idempotencyKey) idempotency.complete({ key: idempotencyKey, result: response });
        audit.append({ type: 'tool.completed', actor: agentId, runId, payload: { toolId, operation, callFingerprint, durationMs, resultFingerprint: fingerprint(result) } });
        return response;
      } catch (error) {
        if (idempotencyKey) {
          if (error?.code === 'TOOL_TIMEOUT') idempotency.markUnknown({ key: idempotencyKey, error: error.message });
          else idempotency.fail({ key: idempotencyKey });
        }
        audit.append({ type: 'tool.failed', actor: agentId, runId, payload: { toolId, operation, callFingerprint, outcome: error?.code === 'TOOL_TIMEOUT' ? 'unknown' : 'failed', error: String(error?.message ?? error) } });
        throw error;
      } finally {
        const durationMs = Date.now() - startedAt;
        try {
          const updatedBudget = recordDuration(runId, durationMs);
          audit.append({ type: 'tool.budget-recorded', actor: agentId, runId, payload: { toolId, durationMs, totalDurationMs: updatedBudget.totalDurationMs } });
        } finally {
          if (lock) locks.release({ resource, token: lock.token });
        }
      }
    },

    getBudget(runId = null) {
      if (budgetStore) {
        if (!runId) throw new Error('Run id required for persistent budget inspection');
        return budgetStore.inspect(runId);
      }
      return { calls, maxCalls, totalDurationMs, maxTotalDurationMs, maxRisk };
    }
  };
};
