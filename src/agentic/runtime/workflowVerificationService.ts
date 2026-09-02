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

    const records = this.evidence.all();
    const executionEvidence = records.find((record) =>
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

    const admissionEvidence = records.find((record) =>
      record.workflowId === request.workflowId
      && record.kind === 'admission'
      && record.payload.manifestId === manifest.id,
    );
    if (!admissionEvidence) {
      throw new Error(`Workflow sem binding versionado de admissão: ${request.workflowId}`);
    }

    const pinnedAgentVersion = admissionEvidence.payload.agentVersion;
    const pinnedSkillId = admissionEvidence.payload.skillId;
    const pinnedSkillVersion = admissionEvidence.payload.skillVersion;
    if (
      typeof pinnedAgentVersion !== 'string' || !pinnedAgentVersion
      || typeof pinnedSkillId !== 'string' || !pinnedSkillId
      || typeof pinnedSkillVersion !== 'string' || !pinnedSkillVersion
    ) {
      throw new Error(`Binding de Agent/Skill inválido no workflow: ${request.workflowId}`);
    }

    const executor = this.registry.get(executionEvidence.agentId);
    if (executor.version !== pinnedAgentVersion) {
      throw new Error(
        `Agent version drift detectado para ${executor.id}: pin=${pinnedAgentVersion}, atual=${executor.version}. Nova admissão obrigatória.`,
      );
    }

    const pinnedSkill = this.skills.get(pinnedSkillId);
    if (pinnedSkill.version !== pinnedSkillVersion) {
      throw new Error(
        `Skill version drift detectado para ${pinnedSkill.id}: pin=${pinnedSkillVersion}, atual=${pinnedSkill.version}. Nova admissão obrigatória.`,
      );
    }
    if (!executor.skillIds.includes(pinnedSkill.id)) {
      throw new Error(`Skill pinada não está mais atribuída ao agente executor: ${pinnedSkill.id}`);
    }

    const currentResolution = this.skills.resolve(manifest.capability, manifest.risk);
    if (!currentResolution.allowed || !currentResolution.skill) {
      throw new Error(`Workflow sem Skill válida para conclusão: ${currentResolution.reason}`);
    }
    if (currentResolution.skill.id !== pinnedSkill.id || currentResolution.skill.version !== pinnedSkill.version) {
      throw new Error(
        `Resolução de Skill divergiu da admissão: pin=${pinnedSkill.id}@${pinnedSkill.version}, atual=${currentResolution.skill.id}@${currentResolution.skill.version}.`,
      );
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
        ...pinnedSkill.requiredEvidence.filter((kind) => kind !== 'verification'),
      ]);
      const missing = [...requiredBeforeReview].filter((kind) => !records.some((record) =>
        record.workflowId === request.workflowId && record.kind === kind,
      ));
      if (missing.length > 0) {
        throw new Error(
          `Evidências obrigatórias ausentes para conclusão (${pinnedSkill.id}): ${missing.join(', ')}`,
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
        executorAgentVersion: pinnedAgentVersion,
        reviewerAgentId: reviewer.id,
        reviewerAgentVersion: reviewer.version,
        manifestId: manifest.id,
        skillId: pinnedSkill.id,
        skillVersion: pinnedSkill.version,
        skillRequiredEvidence: pinnedSkill.requiredEvidence,
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
