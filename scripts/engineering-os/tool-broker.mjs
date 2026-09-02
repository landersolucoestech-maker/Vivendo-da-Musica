import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorize, fingerprint, getAgent } from './runtime.mjs';
import { createApprovalLedger } from './approval-ledger.mjs';
import { createAuditLedger } from './audit-ledger.mjs';
import { createIdempotencyStore } from './idempotency-store.mjs';
import { createLockManager } from './lock-manager.mjs';

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
  maxRisk = 'critical',
  maxCalls = 100,
  maxTotalDurationMs = 1800000
} = {}) => {
  const approvalLedger = approvals ?? createApprovalLedger({ audit });
  let calls = 0;
  let totalDurationMs = 0;

  const budgetCheck = (tool) => {
    if (calls >= maxCalls) throw new Error('Tool call budget exhausted');
    if (totalDurationMs >= maxTotalDurationMs) throw new Error('Tool duration budget exhausted');
    if ((riskRank[tool.risk] ?? Infinity) > (riskRank[maxRisk] ?? 0)) throw new Error(`Tool risk exceeds broker ceiling: ${tool.id}`);
  };

  const approvalRequired = ({ tool, agentId, operation }) => {
    if (tool.approval === 'required') return true;
    const probe = authorize({ agentId, scope: tool.scope, operation, approvals: [] });
    return !probe.allowed && probe.reason.startsWith('approval-required:');
  };

  return {
    audit,
    approvals: approvalLedger,
    locks,
    idempotency,

    async execute({ runId, agentId, toolId, operation = toolId, input = {}, resource = null, approvalId = null, idempotencyKey = null }) {
      if (!runId || !agentId || !toolId || !operation) throw new Error('Tool call missing required fields');
      const tool = getTool(toolId);
      const agent = getAgent(agentId);
      budgetCheck(tool);

      const needsApproval = approvalRequired({ tool, agentId, operation });
      let approval = null;
      if (needsApproval) {
        if (!approvalId) throw new Error(`Approval required for tool call: ${toolId}`);
        approval = approvalLedger.get(approvalId);
        if (approval.status !== 'approved') throw new Error(`Approval is not approved: ${approval.status}`);
      }

      const authorization = authorize({
        agentId,
        scope: tool.scope,
        operation,
        approvals: needsApproval ? [tool.scope, operation] : []
      });
      if (!authorization.allowed) throw new Error(`Tool authorization denied: ${authorization.reason}`);

      if (!agent.allowedScopes.includes(tool.scope)) throw new Error(`Agent lacks tool scope: ${agentId}/${tool.scope}`);
      if (tool.lock && !resource) throw new Error(`Tool requires a locked resource: ${toolId}`);
      if (tool.sideEffect !== 'none' && tool.idempotent && !idempotencyKey) throw new Error(`Idempotency key required: ${toolId}`);

      const request = { runId, agentId, toolId, operation, input, resource };
      if (idempotencyKey) {
        const reservation = idempotency.reserve({ key: idempotencyKey, request });
        if (reservation.replay) {
          audit.append({ type: 'tool.replayed', actor: agentId, runId, payload: { toolId, operation, idempotencyKey } });
          return { ...structuredClone(reservation.result), replayed: true };
        }
        if (reservation.pending) throw new Error(`Idempotent operation already in progress: ${idempotencyKey}`);
      }

      let lock = null;
      const startedAt = Date.now();
      const callFingerprint = fingerprint(request);
      try {
        if (tool.lock) lock = locks.acquire({ resource, owner: `${runId}:${agentId}`, ttlMs: Math.max(tool.timeoutMs + 5000, 10000) });
        if (needsApproval) {
          approvalLedger.consume({ approvalId, runId, scope: tool.scope, operation, toolId, actor: agentId });
        }

        audit.append({
          type: 'tool.started',
          actor: agentId,
          runId,
          payload: { toolId, operation, resource, callFingerprint, risk: tool.risk }
        });

        const adapter = adapters[toolId];
        if (typeof adapter !== 'function') throw new Error(`No adapter registered for tool: ${toolId}`);

        let timer;
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Tool timeout: ${toolId}`)), tool.timeoutMs);
        });
        let result;
        try {
          result = await Promise.race([
            Promise.resolve(adapter({ runId, agentId, operation, input: structuredClone(input), resource, callFingerprint })),
            timeout
          ]);
        } finally {
          clearTimeout(timer);
        }

        const durationMs = Date.now() - startedAt;
        calls += 1;
        totalDurationMs += durationMs;
        const response = { ok: true, toolId, operation, callFingerprint, durationMs, result };
        if (idempotencyKey) idempotency.complete({ key: idempotencyKey, result: response });
        audit.append({ type: 'tool.completed', actor: agentId, runId, payload: { toolId, operation, callFingerprint, durationMs, resultFingerprint: fingerprint(result) } });
        return response;
      } catch (error) {
        if (idempotencyKey) idempotency.fail({ key: idempotencyKey });
        audit.append({ type: 'tool.failed', actor: agentId, runId, payload: { toolId, operation, callFingerprint, error: String(error?.message ?? error) } });
        throw error;
      } finally {
        if (lock) locks.release({ resource, token: lock.token });
      }
    },

    getBudget() {
      return { calls, maxCalls, totalDurationMs, maxTotalDurationMs, maxRisk };
    }
  };
};
