import { createDeploymentCapabilityAdapters } from '@/agentic/adapters/deploymentCapabilityAdapters';
import { EvidenceStore } from '@/agentic/evidence/evidenceStore';
import { createDefaultPolicyEngine } from '@/agentic/policy/defaultPolicySet';
import { createDefaultAgentRegistry } from '@/agentic/registry/defaultAgentRegistry';
import { AgentExecutionKernel } from '@/agentic/runtime/agentExecutionKernel';
import { ApprovalReceiptStore } from '@/agentic/runtime/approvalReceiptStore';
import { CapabilityAdapterRegistry } from '@/agentic/runtime/capabilityAdapterRegistry';
import { DelegationProtocol } from '@/agentic/runtime/delegationProtocol';
import { DeploymentProviderRegistry } from '@/agentic/runtime/deploymentProviderRegistry';
import {
  HostingerDeploymentProvider,
  type HostingerDeploymentConfig,
  type HostingerDeploymentTransport,
} from '@/agentic/runtime/hostingerDeploymentProvider';
import { IdempotencyStore } from '@/agentic/runtime/idempotencyStore';
import { LeaseManager } from '@/agentic/runtime/leaseManager';
import { ToolExecutionGateway } from '@/agentic/runtime/toolExecutionGateway';
import { WorkflowStore } from '@/agentic/workflow/workflowStore';

export interface AgenticRuntimeOptions {
  hostinger?: {
    config: HostingerDeploymentConfig;
    transport: HostingerDeploymentTransport;
  };
}

export const createAgenticRuntime = (options: AgenticRuntimeOptions = {}) => {
  const registry = createDefaultAgentRegistry();
  const policies = createDefaultPolicyEngine();
  const evidence = new EvidenceStore();
  const adapters = new CapabilityAdapterRegistry();
  const deploymentProviders = new DeploymentProviderRegistry();
  const idempotency = new IdempotencyStore();
  const approvals = new ApprovalReceiptStore();
  const leases = new LeaseManager();
  const workflows = new WorkflowStore();

  if (options.hostinger) {
    deploymentProviders.register(new HostingerDeploymentProvider(
      options.hostinger.config,
      options.hostinger.transport,
    ));
    for (const adapter of createDeploymentCapabilityAdapters(deploymentProviders, 'hostinger')) {
      adapters.register(adapter);
    }
  }

  return Object.freeze({
    registry,
    policies,
    evidence,
    adapters,
    deploymentProviders,
    idempotency,
    approvals,
    leases,
    workflows,
    kernel: new AgentExecutionKernel(registry, policies, evidence),
    delegation: new DelegationProtocol(registry),
    gateway: new ToolExecutionGateway(adapters, idempotency, approvals, leases, evidence),
  });
};
