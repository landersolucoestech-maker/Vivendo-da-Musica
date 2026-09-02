import type { AgentExecutionRequest } from '@/agentic/contracts/agentContract';
import { AuditCheckpointGate } from '@/agentic/evidence/auditCheckpointGate';
import { EvidenceStore } from '@/agentic/evidence/evidenceStore';
import { AgentExecutionKernel } from '@/agentic/runtime/agentExecutionKernel';
import { ExecutionManifestStore } from '@/agentic/runtime/executionManifestStore';
import { ToolExecutionGateway, type ToolExecutionRequest } from '@/agentic/runtime/toolExecutionGateway';
import type { WorkflowSnapshot, WorkflowState } from '@/agentic/workflow/workflowEngine';
import { WorkflowStore } from '@/agentic/workflow/workflowStore';

export interface GovernedExecutionRequest<Input = unknown> extends AgentExecutionRequest {
  input: Input;
  idempotencyKey: string;
  executionNonce: string;
  manifestId: string;
  resource: string;
  artifactRef?: string | null;
  approvalReceiptId?: string;
  leaseResource?: string;
  retry?: ToolExecutionRequest<Input>['retry'];
}

export interface GovernedExecutionResult<Output = unknown> {
  result: Output;
  workflow: Readonly<WorkflowSnapshot>;
}

export class GovernedAgentExecutor {
  constructor(
    private readonly kernel: AgentExecutionKernel,
    private readonly gateway: ToolExecutionGateway,
    private readonly workflows: WorkflowStore,
    private readonly evidence: EvidenceStore,
    private readonly manifests: ExecutionManifestStore,
    private readonly auditCheckpoints: AuditCheckpointGate,
  ) {}

  async execute<Input, Output>(request: GovernedExecutionRequest<Input>): Promise<GovernedExecutionResult<Output>> {
    const admission = this.kernel.admit(request);
    if (!admission.allowed || !admission.workflow) {
      throw new Error(`Execução não admitida: ${admission.reason}`);
    }
    if (!admission.agentVersion || !admission.skillId || !admission.skillVersion) {
      throw new Error('Execução admitida sem binding versionado de Agent/Skill.');
    }

    const workflow = admission.workflow;
    const workflowId = workflow.current().id;
    const manifest = this.manifests.assertAndConsume(request.manifestId, {
      correlationId: request.correlationId,
      workflowId,
      agentId: request.agentId,
      capability: request.capability,
      risk: request.risk,
      resource: request.resource,
      artifactRef: request.artifactRef,
      executionNonce: request.executionNonce,
      idempotencyKey: request.idempotencyKey,
    });

    this.evidence.append({
      id: `${request.correlationId}:admission:${this.evidence.all().length}`,
      correlationId: request.correlationId,
      workflowId,
      agentId: request.agentId,
      kind: 'admission',
      occurredAt: new Date().toISOString(),
      payload: {
        manifestId: manifest.id,
        manifestSchemaVersion: manifest.schemaVersion,
        manifestIntegrityDigest: manifest.integrityDigest,
        agentVersion: admission.agentVersion,
        skillId: admission.skillId,
        skillVersion: admission.skillVersion,
        capability: manifest.capability,
        resource: request.resource,
        executionNonce: request.executionNonce,
        idempotencyKey: request.idempotencyKey,
        executionBudgetUsed: this.manifests.executionsUsed(manifest.id),
        executionBudgetMax: manifest.maxExecutions,
      },
    });

    this.transition(workflow, request, 'planned');

    if (admission.policy?.requiresApproval) {
      this.transition(workflow, request, 'awaiting_approval');
    }
    this.transition(workflow, request, 'approved');

    try {
      await this.auditCheckpoints.persistIfRequired({
        phase: 'pre_execution',
        correlationId: request.correlationId,
        workflowId,
        agentId: request.agentId,
        capability: request.capability,
        risk: request.risk,
      });

      this.transition(workflow, request, 'executing');
      workflow.consumeStep();
      this.workflows.save(workflow.current());

      const result = await this.gateway.execute<Input, Output>({
        correlationId: request.correlationId,
        workflowId,
        agentId: request.agentId,
        capability: request.capability,
        risk: request.risk,
        idempotencyKey: request.idempotencyKey,
        manifestId: manifest.id,
        resource: request.resource,
        input: request.input,
        approvalReceiptId: request.approvalReceiptId,
        leaseResource: request.leaseResource,
        retry: request.retry,
      });

      await this.auditCheckpoints.persistIfRequired({
        phase: 'post_execution',
        correlationId: request.correlationId,
        workflowId,
        agentId: request.agentId,
        capability: request.capability,
        risk: request.risk,
      });

      this.transition(workflow, request, 'verifying');
      return { result, workflow: workflow.current() };
    } catch (error) {
      this.transition(workflow, request, 'failed');
      throw error;
    }
  }

  private transition(
    workflow: { transition(next: WorkflowState): Readonly<WorkflowSnapshot>; current(): Readonly<WorkflowSnapshot> },
    request: AgentExecutionRequest,
    next: WorkflowState,
  ): void {
    const previous = workflow.current().state;
    const snapshot = workflow.transition(next);
    this.workflows.save(snapshot);
    this.evidence.append({
      id: `${request.correlationId}:workflow_transition:${this.evidence.all().length}`,
      correlationId: request.correlationId,
      workflowId: snapshot.id,
      agentId: request.agentId,
      kind: 'workflow_transition',
      occurredAt: new Date().toISOString(),
      payload: { from: previous, to: next, stepsExecuted: snapshot.stepsExecuted },
    });
  }
}
