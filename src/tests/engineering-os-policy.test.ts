import { describe, expect, it } from 'vitest';
import { createApprovalLedger } from '../../scripts/engineering-os/approval-ledger.mjs';
import { buildDispatchPlan } from '../../scripts/engineering-os/dispatcher.mjs';

const approve = (ledger: ReturnType<typeof createApprovalLedger>, request: Parameters<typeof ledger.request>[0]) => {
  const approval = ledger.request(request);
  ledger.decide({ approvalId: approval.id, actor: 'reviewer', decision: 'approved', reason: 'Independent approval' });
  return approval.id;
};

describe('Engineering OS policy-backed dispatch', () => {
  it('blocks a protected migration operation without a ledger approval', () => {
    const plan = buildDispatchPlan({ workflowId: 'migration', runId: 'migration-run' });
    const migration = plan.steps.find((step) => step.stepId === 'migration-change');
    expect(migration?.authorization.allowed).toBe(false);
    expect(migration?.authorization.reason).toMatch(/approval-required/);
    expect(plan.executable).toBe(false);
  });

  it('accepts a matching independent ledger approval for the protected migration operation', () => {
    const approvals = createApprovalLedger();
    approve(approvals, {
      runId: 'migration-run-approved',
      requestedBy: 'migration-engineer',
      scope: 'migration-write',
      operation: 'data-migration',
      toolId: null,
      risk: 'high',
      reason: 'Apply reviewed migration'
    });

    const plan = buildDispatchPlan({ workflowId: 'migration', runId: 'migration-run-approved', approvalLedger: approvals });
    const migration = plan.steps.find((step) => step.stepId === 'migration-change');
    expect(migration?.authorization.allowed).toBe(true);
    expect(migration?.authorization.approvalId).toBeTruthy();
    expect(plan.executable).toBe(true);
  });

  it('does not let an approval for a different run unlock a protected operation', () => {
    const approvals = createApprovalLedger();
    approve(approvals, {
      runId: 'other-run',
      requestedBy: 'migration-engineer',
      scope: 'migration-write',
      operation: 'data-migration',
      toolId: null,
      risk: 'high',
      reason: 'Approval belongs elsewhere'
    });

    const plan = buildDispatchPlan({ workflowId: 'migration', runId: 'target-run', approvalLedger: approvals });
    expect(plan.steps.find((step) => step.stepId === 'migration-change')?.authorization.allowed).toBe(false);
  });
});
