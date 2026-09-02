import { EvidenceStore } from '@/agentic/evidence/evidenceStore';
import { createDefaultPolicyEngine } from '@/agentic/policy/defaultPolicySet';
import { createDefaultAgentRegistry } from '@/agentic/registry/defaultAgentRegistry';
import { AgentExecutionKernel } from '@/agentic/runtime/agentExecutionKernel';
import { ApprovalReceiptStore } from '@/agentic/runtime/approvalReceiptStore';
import { CapabilityAdapterRegistry } from '@/agentic/runtime/capabilityAdapterRegistry';
import { DelegationProtocol } from '@/agentic/runtime/delegationProtocol';
import { IdempotencyStore } from '@/agentic/runtime/idempotencyStore';
import { LeaseManager } from '@/agentic/runtime/leaseManager';
import { ToolExecutionGateway } from '@/agentic/runtime/toolExecutionGateway';
import { WorkflowStore } from '@/agentic/workflow/workflowStore';

export const createAgenticRuntime = () => {
  const registry = createDefaultAgentRegistry();
  const policies = createDefaultPolicyEngine();
  const evidence = new EvidenceStore();
  const adapters = new CapabilityAdapterRegistry();
  const idempotency = new IdempotencyStore();
  const approvals = new ApprovalReceiptStore();
  const leases = new LeaseManager();
  const workflows = new WorkflowStore();

  return Object.freeze({
    registry,
    policies,
    evidence,
    adapters,
    idempotency,
    approvals,
    leases,
    workflows,
    kernel: new AgentExecutionKernel(registry, policies, evidence),
    delegation: new DelegationProtocol(registry),
    gateway: new ToolExecutionGateway(adapters, idempotency, approvals, leases),
  });
};
