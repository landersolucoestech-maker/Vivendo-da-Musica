import { createDeploymentCapabilityAdapters } from '@/agentic/adapters/deploymentCapabilityAdapters';
import { createPostHogCapabilityAdapters, type PostHogTransport } from '@/agentic/adapters/posthogCapabilityAdapters';
import { createRepositoryCapabilityAdapters, type RepositoryTransport } from '@/agentic/adapters/repositoryCapabilityAdapters';
import { createSupabaseCapabilityAdapters, type SupabaseTransport } from '@/agentic/adapters/supabaseCapabilityAdapters';
import type {
  ExecutionManifestIntegrityVerifier,
  ExecutionManifestSignatureVerifier,
} from '@/agentic/contracts/executionManifest';
import { AuditCheckpointGate } from '@/agentic/evidence/auditCheckpointGate';
import type { AuditCheckpointTransport } from '@/agentic/evidence/auditCheckpointTransport';
import { EvidenceStore } from '@/agentic/evidence/evidenceStore';
import { createDefaultPolicyEngine } from '@/agentic/policy/defaultPolicySet';
import { createDefaultAgentRegistry } from '@/agentic/registry/defaultAgentRegistry';
import { AgentExecutionKernel } from '@/agentic/runtime/agentExecutionKernel';
import { ApprovalReceiptStore } from '@/agentic/runtime/approvalReceiptStore';
import { CapabilityAdapterRegistry } from '@/agentic/runtime/capabilityAdapterRegistry';
import { createDefaultCapabilityQuotaStore } from '@/agentic/runtime/capabilityQuotaStore';
import { DelegationProtocol } from '@/agentic/runtime/delegationProtocol';
import { DeploymentProviderRegistry } from '@/agentic/runtime/deploymentProviderRegistry';
import { ExecutionManifestStore } from '@/agentic/runtime/executionManifestStore';
import { GovernedAgentExecutor } from '@/agentic/runtime/governedAgentExecutor';
import {
  HostingerDeploymentProvider,
  type HostingerDeploymentConfig,
  type HostingerDeploymentTransport,
} from '@/agentic/runtime/hostingerDeploymentProvider';
import { IdempotencyStore } from '@/agentic/runtime/idempotencyStore';
import { LeaseManager } from '@/agentic/runtime/leaseManager';
import { ToolExecutionGateway } from '@/agentic/runtime/toolExecutionGateway';
import { WorkflowVerificationService } from '@/agentic/runtime/workflowVerificationService';
import { WorkflowStore } from '@/agentic/workflow/workflowStore';

export interface AgenticRuntimeOptions {
  github?: RepositoryTransport;
  supabase?: SupabaseTransport;
  posthog?: PostHogTransport;
  auditCheckpointTransport?: AuditCheckpointTransport;
  manifestSignatureVerifier?: ExecutionManifestSignatureVerifier;
  manifestIntegrityVerifier?: ExecutionManifestIntegrityVerifier;
  hostinger?: {
    config: HostingerDeploymentConfig;
    transport: HostingerDeploymentTransport;
  };
}

const registerAdapters = (
  registry: CapabilityAdapterRegistry,
  capabilityAdapters: ReturnType<typeof createRepositoryCapabilityAdapters>,
): void => {
  for (const adapter of capabilityAdapters) registry.register(adapter);
};

export const createAgenticRuntime = (options: AgenticRuntimeOptions = {}) => {
  const registry = createDefaultAgentRegistry();
  const policies = createDefaultPolicyEngine();
  const evidence = new EvidenceStore();
  const auditCheckpoints = new AuditCheckpointGate(evidence, options.auditCheckpointTransport);
  const adapters = new CapabilityAdapterRegistry();
  const deploymentProviders = new DeploymentProviderRegistry();
  const idempotency = new IdempotencyStore();
  const approvals = new ApprovalReceiptStore();
  const leases = new LeaseManager();
  const quotas = createDefaultCapabilityQuotaStore();
  const workflows = new WorkflowStore();
  const manifests = new ExecutionManifestStore(
    options.manifestSignatureVerifier,
    options.manifestIntegrityVerifier,
  );

  if (options.github) registerAdapters(adapters, createRepositoryCapabilityAdapters(options.github));
  if (options.supabase) registerAdapters(adapters, createSupabaseCapabilityAdapters(options.supabase));
  if (options.posthog) registerAdapters(adapters, createPostHogCapabilityAdapters(options.posthog));

  if (options.hostinger) {
    deploymentProviders.register(new HostingerDeploymentProvider(
      options.hostinger.config,
      options.hostinger.transport,
    ));
    registerAdapters(adapters, createDeploymentCapabilityAdapters(deploymentProviders, 'hostinger'));
  }

  registry.seal();
  adapters.seal();
  deploymentProviders.seal();

  const kernel = new AgentExecutionKernel(registry, policies, evidence);
  const gateway = new ToolExecutionGateway(adapters, idempotency, approvals, leases, evidence, quotas);
  const executor = new GovernedAgentExecutor(
    kernel,
    gateway,
    workflows,
    evidence,
    manifests,
    auditCheckpoints,
  );
  const verification = new WorkflowVerificationService(
    registry,
    workflows,
    evidence,
    manifests,
    auditCheckpoints,
  );

  return Object.freeze({
    registry,
    policies,
    evidence,
    auditCheckpoints,
    adapters,
    deploymentProviders,
    idempotency,
    approvals,
    leases,
    quotas,
    workflows,
    manifests,
    kernel,
    delegation: new DelegationProtocol(registry),
    executor,
    verification,
  });
};
