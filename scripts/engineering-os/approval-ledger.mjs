import crypto from 'node:crypto';
import { fingerprint } from './runtime.mjs';

const finalStates = new Set(['approved', 'rejected', 'expired', 'consumed']);

export const createApprovalLedger = ({ audit = null, now = () => Date.now() } = {}) => {
  const approvals = new Map();

  const read = (id) => {
    const approval = approvals.get(id);
    if (!approval) throw new Error(`Unknown approval: ${id}`);
    if (approval.status === 'pending' || approval.status === 'approved') {
      if (Date.parse(approval.expiresAt) <= now()) {
        const expired = { ...approval, status: 'expired', updatedAt: new Date(now()).toISOString() };
        approvals.set(id, expired);
        audit?.append({ type: 'approval.expired', actor: 'runtime', runId: approval.runId, payload: { approvalId: id } });
        return expired;
      }
    }
    return approval;
  };

  return {
    request({ runId, requestedBy, scope, operation, toolId = null, risk = 'medium', ttlMs = 900000, reason }) {
      if (!runId || !requestedBy || !scope || !operation || !reason) throw new Error('Approval request missing required fields');
      if (!Number.isSafeInteger(ttlMs) || ttlMs < 1000 || ttlMs > 86400000) throw new Error('Invalid approval TTL');
      const createdAt = new Date(now()).toISOString();
      const approval = {
        id: crypto.randomUUID(),
        runId,
        requestedBy,
        scope,
        operation,
        toolId,
        risk,
        reason,
        status: 'pending',
        createdAt,
        updatedAt: createdAt,
        expiresAt: new Date(now() + ttlMs).toISOString(),
        approvedBy: null,
        decisionReason: null,
        consumedAt: null
      };
      const stored = { ...approval, fingerprint: fingerprint(approval) };
      approvals.set(stored.id, stored);
      audit?.append({ type: 'approval.requested', actor: requestedBy, runId, payload: { approvalId: stored.id, scope, operation, toolId, risk } });
      return structuredClone(stored);
    },

    decide({ approvalId, actor, decision, reason }) {
      const approval = read(approvalId);
      if (approval.status !== 'pending') throw new Error(`Approval is not pending: ${approval.status}`);
      if (!['approved', 'rejected'].includes(decision)) throw new Error(`Invalid approval decision: ${decision}`);
      if (!actor || !reason) throw new Error('Approval decision requires actor and reason');
      if (['high', 'critical'].includes(approval.risk) && actor === approval.requestedBy) {
        throw new Error('High-risk approvals require an independent approver');
      }
      const next = {
        ...approval,
        status: decision,
        approvedBy: decision === 'approved' ? actor : null,
        decisionReason: reason,
        updatedAt: new Date(now()).toISOString()
      };
      approvals.set(approvalId, next);
      audit?.append({ type: `approval.${decision}`, actor, runId: approval.runId, payload: { approvalId, reason } });
      return structuredClone(next);
    },

    consume({ approvalId, runId, scope, operation, toolId = null, actor }) {
      const approval = read(approvalId);
      if (approval.status !== 'approved') throw new Error(`Approval cannot be consumed: ${approval.status}`);
      if (approval.runId !== runId || approval.scope !== scope || approval.operation !== operation || approval.toolId !== toolId) {
        throw new Error('Approval does not match requested operation');
      }
      const next = {
        ...approval,
        status: 'consumed',
        consumedAt: new Date(now()).toISOString(),
        updatedAt: new Date(now()).toISOString()
      };
      approvals.set(approvalId, next);
      audit?.append({ type: 'approval.consumed', actor, runId, payload: { approvalId, scope, operation, toolId } });
      return structuredClone(next);
    },

    get(approvalId) {
      return structuredClone(read(approvalId));
    },

    list({ runId = null, status = null } = {}) {
      return [...approvals.values()]
        .map((approval) => read(approval.id))
        .filter((approval) => !runId || approval.runId === runId)
        .filter((approval) => !status || approval.status === status)
        .map((approval) => structuredClone(approval));
    },

    isFinal(approvalId) {
      return finalStates.has(read(approvalId).status);
    }
  };
};
