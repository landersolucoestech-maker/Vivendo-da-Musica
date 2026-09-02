import { describe, expect, it } from 'vitest';

import { createDefaultAgentRegistry } from '@/agentic/registry/defaultAgentRegistry';
import { ApprovalReceiptStore } from '@/agentic/runtime/approvalReceiptStore';
import { CapabilityAdapterRegistry } from '@/agentic/runtime/capabilityAdapterRegistry';
import { DelegationProtocol } from '@/agentic/runtime/delegationProtocol';
import { IdempotencyStore } from '@/agentic/runtime/idempotencyStore';
import { LeaseManager } from '@/agentic/runtime/leaseManager';
import { ToolExecutionGateway } from '@/agentic/runtime/toolExecutionGateway';
import { WorkflowStore } from '@/agentic/workflow/workflowStore';

describe('agentic runtime governance', () => {
  it('requires a valid approval receipt for privileged execution', async () => {
    const adapters = new CapabilityAdapterRegistry();
    adapters.register({
      capability: 'deploy.production',
      allowedRisks: ['privileged'],
      async execute() { return 'ok'; },
    });
    const approvals = new ApprovalReceiptStore();
    const leases = new LeaseManager();
    leases.acquire('production', 'release-agent', 60_000);
    const gateway = new ToolExecutionGateway(adapters, new IdempotencyStore(), approvals, leases);

    await expect(gateway.execute({
      correlationId: 'c1', workflowId: 'w1', agentId: 'release-agent', capability: 'deploy.production',
      risk: 'privileged', idempotencyKey: 'k1', leaseResource: 'production', input: {},
    })).rejects.toThrow('Approval receipt obrigatório');

    approvals.issue({
      id: 'a1', correlationId: 'c1', workflowId: 'w1', agentId: 'release-agent', capability: 'deploy.production',
      approverId: 'human-1', approvedAt: '2026-09-02T05:00:00.000Z', expiresAt: '2099-09-02T05:30:00.000Z',
    });

    await expect(gateway.execute({
      correlationId: 'c1', workflowId: 'w1', agentId: 'release-agent', capability: 'deploy.production',
      risk: 'privileged', idempotencyKey: 'k2', leaseResource: 'production', approvalReceiptId: 'a1', input: {},
    })).resolves.toBe('ok');
  });

  it('returns a completed idempotent result without executing twice', async () => {
    let calls = 0;
    const adapters = new CapabilityAdapterRegistry();
    adapters.register({
      capability: 'repo.read', allowedRisks: ['read'], async execute() { calls += 1; return { value: 1 }; },
    });
    const gateway = new ToolExecutionGateway(adapters, new IdempotencyStore(), new ApprovalReceiptStore(), new LeaseManager());
    const request = {
      correlationId: 'c2', workflowId: 'w2', agentId: 'engineering-orchestrator', capability: 'repo.read',
      risk: 'read' as const, idempotencyKey: 'same', input: {},
    };
    await gateway.execute(request);
    await gateway.execute(request);
    expect(calls).toBe(1);
  });

  it('blocks delegation cycles and missing capabilities', () => {
    const protocol = new DelegationProtocol(createDefaultAgentRegistry());
    expect(() => protocol.admit({
      correlationId: 'c3', workflowId: 'w3', fromAgentId: 'engineering-orchestrator', toAgentId: 'frontend-agent',
      capability: 'frontend.implement', lineage: ['engineering-orchestrator', 'frontend-agent'],
    })).toThrow('Ciclo de delegação');
    expect(() => protocol.admit({
      correlationId: 'c3', workflowId: 'w3', fromAgentId: 'engineering-orchestrator', toAgentId: 'qa-agent',
      capability: 'repo.write', lineage: ['engineering-orchestrator'],
    })).toThrow('Capability negada');
  });

  it('prevents persisted workflows from regressing or reopening terminal state', () => {
    const store = new WorkflowStore();
    store.save({ id: 'w4', state: 'executing', stepsExecuted: 2, maxSteps: 10, verified: false, failureReason: null });
    expect(() => store.save({ id: 'w4', state: 'executing', stepsExecuted: 1, maxSteps: 10, verified: false, failureReason: null })).toThrow('regredir');
    store.save({ id: 'w5', state: 'failed', stepsExecuted: 1, maxSteps: 10, verified: false, failureReason: 'x' });
    expect(() => store.save({ id: 'w5', state: 'investigating', stepsExecuted: 1, maxSteps: 10, verified: false, failureReason: null })).toThrow('terminal');
  });
});
