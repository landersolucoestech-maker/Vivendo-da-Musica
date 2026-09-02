import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

export const registry = readJson('engineering-os/registry/agents.json');
export const runtimePolicy = readJson('engineering-os/policies/runtime-policy.json');

const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
};

export const fingerprint = (value) => crypto
  .createHash('sha256')
  .update(JSON.stringify(stable(value)))
  .digest('hex');

export const getAgent = (agentId) => {
  const agent = registry.agents.find((candidate) => candidate.id === agentId);
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);
  return agent;
};

export const authorize = ({ agentId, scope, operation, approvals = [] }) => {
  const agent = getAgent(agentId);
  if (agent.deniedScopes.includes(scope)) return { allowed: false, reason: `scope-denied:${scope}` };
  if (!agent.allowedScopes.includes(scope)) return { allowed: false, reason: `scope-not-allowed:${scope}` };

  const protectedAction = runtimePolicy.protectedScopes.includes(scope)
    || runtimePolicy.destructiveOperations.includes(operation)
    || agent.requiresApprovalFor.includes(scope)
    || agent.requiresApprovalFor.includes(operation);

  if (protectedAction && !approvals.includes(scope) && !approvals.includes(operation)) {
    return { allowed: false, reason: `approval-required:${operation || scope}` };
  }
  return { allowed: true, reason: 'authorized' };
};

const transitions = {
  created: ['planned', 'cancelled'],
  planned: ['running', 'cancelled'],
  running: ['blocked', 'awaiting-approval', 'review', 'failed', 'cancelled'],
  blocked: ['running', 'failed', 'cancelled'],
  'awaiting-approval': ['running', 'cancelled'],
  review: ['running', 'completed', 'failed'],
  completed: [],
  failed: [],
  cancelled: []
};

export const createRun = ({ workflowId, risk = 'medium', metadata = {} }) => ({
  version: 1,
  id: crypto.randomUUID(),
  workflowId,
  risk,
  status: 'created',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata,
  approvals: [],
  steps: {},
  gates: {},
  evidence: [],
  events: []
});

export const transitionRun = (run, nextStatus, reason) => {
  const allowed = transitions[run.status] ?? [];
  if (!allowed.includes(nextStatus)) throw new Error(`Invalid transition: ${run.status} -> ${nextStatus}`);
  const now = new Date().toISOString();
  return {
    ...run,
    status: nextStatus,
    updatedAt: now,
    events: [...run.events, { type: 'transition', from: run.status, to: nextStatus, reason, timestamp: now }]
  };
};

export const addApproval = (run, approval) => {
  if (!approval?.scope || !approval?.actor || !approval?.timestamp) throw new Error('Invalid approval');
  return { ...run, approvals: [...run.approvals, approval], updatedAt: new Date().toISOString() };
};

export const addEvidence = (run, evidence) => {
  for (const field of runtimePolicy.evidence.minimumFields) {
    if (!evidence?.[field]) throw new Error(`Evidence missing field: ${field}`);
  }
  if (!runtimePolicy.evidence.allowedKinds.includes(evidence.kind)) throw new Error(`Unsupported evidence kind: ${evidence.kind}`);
  if (evidence.kind === 'manual-verification' && evidence.result === 'claim-only') throw new Error('Claim-only evidence is forbidden');
  const enriched = { ...evidence, id: evidence.id ?? crypto.randomUUID(), fingerprint: fingerprint(evidence) };
  return { ...run, evidence: [...run.evidence, enriched], updatedAt: new Date().toISOString() };
};

export const setGate = (run, gateId, { status, evidenceIds = [], reason = null }) => {
  if (!['pending', 'passed', 'failed', 'blocked'].includes(status)) throw new Error(`Invalid gate status: ${status}`);
  if (status === 'passed' && runtimePolicy.completion.requireEvidenceForEachGate && evidenceIds.length === 0) {
    throw new Error(`Gate ${gateId} cannot pass without evidence`);
  }
  const knownEvidence = new Set(run.evidence.map((item) => item.id));
  for (const evidenceId of evidenceIds) {
    if (!knownEvidence.has(evidenceId)) throw new Error(`Unknown evidence: ${evidenceId}`);
  }
  return {
    ...run,
    gates: { ...run.gates, [gateId]: { status, evidenceIds, reason, updatedAt: new Date().toISOString() } },
    updatedAt: new Date().toISOString()
  };
};

export const evaluateCompletion = ({ run, workflow }) => {
  const failures = [];
  const evidenceById = new Map((run.evidence ?? []).map((item) => [item.id, item]));
  if (runtimePolicy.completion.requireAllRequiredGates) {
    for (const gateId of workflow.requiredGates ?? []) {
      const gate = run.gates[gateId];
      if (!gate) {
        failures.push(`missing-gate:${gateId}`);
        continue;
      }
      if (gate.status !== 'passed') {
        failures.push(`gate-not-passed:${gateId}:${gate.status}`);
        continue;
      }
      if (runtimePolicy.completion.requireEvidenceForEachGate && gate.evidenceIds.length === 0) {
        failures.push(`gate-without-evidence:${gateId}`);
        continue;
      }
      const producer = (workflow.steps ?? []).find((step) => (step.gates ?? []).includes(gateId));
      if (producer) {
        const hasProducerEvidence = gate.evidenceIds
          .map((id) => evidenceById.get(id))
          .some((evidence) => evidence?.producerAgentId === producer.agent && evidence?.producerSkillId === producer.skill);
        if (!hasProducerEvidence) failures.push(`gate-evidence-provenance-mismatch:${gateId}:${producer.agent}:${producer.skill}`);
      }
    }
  }
  if (runtimePolicy.completion.requireIndependentReviewForRisk.includes(run.risk)) {
    const reviewGate = run.gates['independent-review'];
    if (!reviewGate || reviewGate.status !== 'passed') failures.push('independent-review-required');
  }
  if (runtimePolicy.completion.requireNoPendingApprovals && run.status === 'awaiting-approval') failures.push('pending-approval');
  if (runtimePolicy.completion.requireNoFailedRequiredSteps) {
    for (const [stepId, step] of Object.entries(run.steps)) {
      if (step.required && step.status === 'failed') failures.push(`required-step-failed:${stepId}`);
    }
  }
  return { complete: failures.length === 0, failures, fingerprint: fingerprint({ run, workflow }) };
};

export const loadWorkflow = (workflowId) => readJson(`engineering-os/workflows/${workflowId}.json`);
