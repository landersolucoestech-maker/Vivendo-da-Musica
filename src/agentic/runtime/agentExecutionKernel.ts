import type { AgentExecutionRequest } from '@/agentic/contracts/agentContract';
import { EvidenceStore } from '@/agentic/evidence/evidenceStore';
import { PolicyEngine, type PolicyDecision } from '@/agentic/policy/policyEngine';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';
import type { SkillRegistry } from '@/agentic/registry/skillRegistry';
import { DeterministicAgentRuntime } from '@/agentic/runtime/deterministicAgentRuntime';
import { WorkflowEngine } from '@/agentic/workflow/workflowEngine';

export interface ExecutionAdmission {
  allowed: boolean;
  reason: string;
  policy: PolicyDecision | null;
  workflow: WorkflowEngine | null;
}

export class AgentExecutionKernel {
  private readonly runtime: DeterministicAgentRuntime;

  constructor(
    private readonly registry: AgentRegistry,
    private readonly policyEngine: PolicyEngine,
    private readonly evidenceStore: EvidenceStore,
    skills?: SkillRegistry,
  ) {
    this.runtime = new DeterministicAgentRuntime(registry, skills);
  }

  admit(request: AgentExecutionRequest): ExecutionAdmission {
    const admission = this.runtime.admit(request);
    this.evidenceStore.append({
      id: `${request.correlationId}:admission:${this.evidenceStore.all().length}`,
      correlationId: request.correlationId,
      workflowId: null,
      agentId: request.agentId,
      kind: 'admission',
      occurredAt: new Date().toISOString(),
      payload: {
        capability: request.capability,
        risk: request.risk,
        allowed: admission.allowed,
        reason: admission.reason,
      },
    });

    if (!admission.allowed || !admission.agent) {
      return {
        allowed: false,
        reason: admission.reason,
        policy: null,
        workflow: null,
      };
    }

    const policy = this.policyEngine.evaluate({
      agentId: request.agentId,
      capability: request.capability,
      risk: request.risk,
      approvedByHuman: request.approvedByHuman,
    });

    this.evidenceStore.append({
      id: `${request.correlationId}:policy:${this.evidenceStore.all().length}`,
      correlationId: request.correlationId,
      workflowId: null,
      agentId: request.agentId,
      kind: 'policy',
      occurredAt: new Date().toISOString(),
      payload: {
        effect: policy.effect,
        allowed: policy.allowed,
        requiresApproval: policy.requiresApproval,
        matchedRuleIds: policy.matchedRuleIds,
        reasons: policy.reasons,
      },
    });

    if (!policy.allowed) {
      return {
        allowed: false,
        reason: policy.reasons.join(' '),
        policy,
        workflow: null,
      };
    }

    const workflowId = `${request.correlationId}:${request.agentId}`;
    const workflow = new WorkflowEngine(workflowId, admission.agent.maxSteps);
    return {
      allowed: true,
      reason: 'Execução admitida pelo contrato do agente, Skill registrada e pelas policies.',
      policy,
      workflow,
    };
  }
}
