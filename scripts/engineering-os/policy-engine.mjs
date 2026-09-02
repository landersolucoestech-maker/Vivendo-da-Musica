import { authorize, getAgent } from './runtime.mjs';

const matchingApproval = ({ approvalLedger, runId, scope, operation, toolId }) => {
  if (!approvalLedger) return null;
  return approvalLedger.list({ runId, status: 'approved' }).find((approval) => (
    approval.scope === scope
    && approval.operation === operation
    && approval.toolId === toolId
  )) ?? null;
};

export const decideOperation = ({ agentId, scope, operation, runId, approvalLedger = null, toolId = null, forceApproval = false }) => {
  const agent = getAgent(agentId);
  const initial = authorize({ agentId, scope, operation, approvals: [] });
  const policyRequiresApproval = !initial.allowed && initial.reason.startsWith('approval-required:');

  if (!initial.allowed && !policyRequiresApproval) {
    return { allowed: false, reason: initial.reason, agentId: agent.id, approvalId: null, approvalRequired: false };
  }

  const approvalRequired = forceApproval || policyRequiresApproval;
  if (!approvalRequired) {
    return { allowed: true, reason: 'authorized', agentId: agent.id, approvalId: null, approvalRequired: false };
  }

  const approval = matchingApproval({ approvalLedger, runId, scope, operation, toolId });
  if (!approval) {
    return { allowed: false, reason: `approval-required:${operation || scope}`, agentId: agent.id, approvalId: null, approvalRequired: true };
  }

  if (policyRequiresApproval) {
    const verified = authorize({ agentId, scope, operation, approvals: [scope, operation] });
    if (!verified.allowed) {
      return { allowed: false, reason: verified.reason, agentId: agent.id, approvalId: null, approvalRequired: true };
    }
  }

  return {
    allowed: true,
    reason: 'authorized-with-ledger-approval',
    agentId: agent.id,
    approvalId: approval.id,
    approvalRequired: true
  };
};
