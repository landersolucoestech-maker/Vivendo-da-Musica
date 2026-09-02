import { EvidenceStore } from '@/agentic/evidence/evidenceStore';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';
import { evaluateIndependentReview } from '@/agentic/runtime/separationOfDuties';
import { WorkflowEngine, type WorkflowSnapshot } from '@/agentic/workflow/workflowEngine';
import { WorkflowStore } from '@/agentic/workflow/workflowStore';

export interface WorkflowVerificationRequest {
  workflowId: string;
  reviewerAgentId: string;
  passed: boolean;
  reason?: string;
}

export class WorkflowVerificationService {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly workflows: WorkflowStore,
    private readonly evidence: EvidenceStore,
  ) {}

  verify(request: WorkflowVerificationRequest): Readonly<WorkflowSnapshot> {
    const persisted = this.workflows.get(request.workflowId);
    if (!persisted) throw new Error(`Workflow não encontrado: ${request.workflowId}`);
    if (persisted.state !== 'verifying') throw new Error(`Workflow não está em verifying: ${request.workflowId}`);

    const executionEvidence = this.evidence.all().find((record) =>
      record.workflowId === request.workflowId && record.kind === 'tool_call',
    );
    if (!executionEvidence) throw new Error(`Workflow sem evidência de execução: ${request.workflowId}`);

    const reviewer = this.registry.get(request.reviewerAgentId);
    const separation = evaluateIndependentReview({
      executorAgentId: executionEvidence.agentId,
      reviewerAgentId: reviewer.id,
      reviewerCapabilities: reviewer.capabilities,
      reviewerDeniedCapabilities: reviewer.deniedCapabilities,
    });
    if (!separation.allowed) throw new Error(separation.reason);

    const workflow = WorkflowEngine.restore(persisted);
    const verification = workflow.recordVerification(request.passed, request.reason);
    this.evidence.append({
      id: `${executionEvidence.correlationId}:verification:${this.evidence.all().length}`,
      correlationId: executionEvidence.correlationId,
      workflowId: request.workflowId,
      agentId: reviewer.id,
      kind: 'verification',
      occurredAt: new Date().toISOString(),
      payload: {
        passed: request.passed,
        reason: request.reason?.trim() || null,
        executorAgentId: executionEvidence.agentId,
        reviewerAgentId: reviewer.id,
        separationOfDuties: separation.reason,
      },
    });

    if (!request.passed) {
      this.workflows.save(verification);
      this.appendTransition(executionEvidence.correlationId, reviewer.id, request.workflowId, 'verifying', 'failed', verification.stepsExecuted);
      return verification;
    }

    const completed = workflow.transition('completed');
    this.workflows.save(completed);
    this.appendTransition(executionEvidence.correlationId, reviewer.id, request.workflowId, 'verifying', 'completed', completed.stepsExecuted);
    return completed;
  }

  private appendTransition(
    correlationId: string,
    agentId: string,
    workflowId: string,
    from: 'verifying',
    to: 'completed' | 'failed',
    stepsExecuted: number,
  ): void {
    this.evidence.append({
      id: `${correlationId}:workflow_transition:${this.evidence.all().length}`,
      correlationId,
      workflowId,
      agentId,
      kind: 'workflow_transition',
      occurredAt: new Date().toISOString(),
      payload: { from, to, stepsExecuted },
    });
  }
}
