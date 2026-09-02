import { manifestHasRequiredEvidence } from '@/agentic/contracts/executionManifest';
import { AuditCheckpointGate } from '@/agentic/evidence/auditCheckpointGate';
import { EvidenceStore } from '@/agentic/evidence/evidenceStore';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';
import { SkillRegistry } from '@/agentic/registry/skillRegistry';
import { ExecutionManifestStore } from '@/agentic/runtime/executionManifestStore';
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
    private readonly skills: SkillRegistry,
    private readonly workflows: WorkflowStore,
    private readonly evidence: EvidenceStore,
    private readonly manifests: ExecutionManifestStore,
    private readonly auditCheckpoints: AuditCheckpointGate,
  ) {}

  async verify(request: WorkflowVerificationRequest): Promise<Readonly<WorkflowSnapshot>> {
    const persisted = this.workflows.get(request.workflowId);
    if (!persisted) throw new Error(`Workflow não encontrado: ${request.workflowId}`);
    if (persisted.state !== 'verifying') throw new Error(`Workflow não está em verifying: ${request.workflowId}`);

    const executionEvidence = this.evidence.all().find((record) =>
      record.workflowId === request.workflowId && record.kind === 'tool_call',
    );
    if (!executionEvidence) throw new Error(`Workflow sem evidência de execução: ${request.workflowId}`);

    const manifestId = executionEvidence.payload.manifestId;
    if (typeof manifestId !== 'string' || !manifestId) {
      throw new Error(`Workflow sem Execution Manifest vinculado: ${request.workflowId}`);
    }
    const manifest = this.manifests.get(manifestId);
    if (manifest.workflowId !== request.workflowId) {
      throw new Error(`Execution Manifest não pertence ao workflow: ${request.workflowId}`);
    }

    const skillResolution = this.skills.resolve(manifest.capability, manifest.risk);
    if (!skillResolution.allowed || !skillResolution.skill) {
      throw new Error(`Workflow sem Skill válida para conclusão: ${skillResolution.reason}`);
    }

    const reviewer = this.registry.get(request.reviewerAgentId);
    const separation = evaluateIndependentReview({
      executorAgentId: executionEvidence.agentId,
      reviewerAgentId: reviewer.id,
      reviewerCapabilities: reviewer.capabilities,
      reviewerDeniedCapabilities: reviewer.deniedCapabilities,
    });
    if (!separation.allowed) throw new Error(separation.reason);

    if (request.passed) {
      const requiredBeforeReview = new Set([
        ...manifest.requiredEvidenceKinds.filter((kind) => kind !== 'verification'),
        ...skillResolution.skill.requiredEvidence.filter((kind) => kind !== 'verification'),
      ]);
      const missing = [...requiredBeforeReview].filter((kind) => !this.evidence.all().some((record) =>
        record.workflowId === request.workflowId && record.kind === kind,
      ));
      if (missing.length > 0) {
        throw new Error(
          `Evidências obrigatórias ausentes para conclusão (${skillResolution.skill.id}): ${missing.join(', ')}`,
        );
      }
    }

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
        manifestId: manifest.id,
        skillId: skillResolution.skill.id,
        skillVersion: skillResolution.skill.version,
        skillRequiredEvidence: skillResolution.skill.requiredEvidence,
        separationOfDuties: separation.reason,
      },
    });

    if (!request.passed) {
      this.workflows.save(verification);
      this.appendTransition(
        executionEvidence.correlationId,
        reviewer.id,
        request.workflowId,
        'verifying',
        'failed',
        verification.stepsExecuted,
      );
      await this.auditCheckpoints.persistIfRequired({
        phase: 'verification_failed',
        correlationId: executionEvidence.correlationId,
        workflowId: request.workflowId,
        agentId: reviewer.id,
        capability: manifest.capability,
        risk: manifest.risk,
      });
      return verification;
    }

    if (!manifestHasRequiredEvidence(manifest, this.evidence.all())) {
      throw new Error(`Execution Manifest sem todas as evidências obrigatórias: ${manifest.id}`);
    }

    await this.auditCheckpoints.persistIfRequired({
      phase: 'pre_completion',
      correlationId: executionEvidence.correlationId,
      workflowId: request.workflowId,
      agentId: reviewer.id,
      capability: manifest.capability,
      risk: manifest.risk,
    });

    const completed = workflow.transition('completed');
    this.workflows.save(completed);
    this.appendTransition(
      executionEvidence.correlationId,
      reviewer.id,
      request.workflowId,
      'verifying',
      'completed',
      completed.stepsExecuted,
    );
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
