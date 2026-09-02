import type { AgentRisk } from '@/agentic/contracts/agentContract';
import type { EvidenceCheckpoint } from '@/agentic/evidence/evidenceStore';

export type AuditCheckpointPhase = 'pre_execution' | 'post_execution' | 'pre_completion' | 'verification_failed';

export interface AuditCheckpointContext {
  phase: AuditCheckpointPhase;
  correlationId: string;
  workflowId: string;
  agentId: string;
  capability: string;
  risk: AgentRisk;
}

export interface AuditCheckpointReceipt {
  persistenceId: string;
  headHash: string | null;
  recordCount: number;
  persistedAt: string;
}

export interface AuditCheckpointTransport {
  persist(
    checkpoint: Readonly<EvidenceCheckpoint>,
    context: Readonly<AuditCheckpointContext>,
  ): Promise<Readonly<AuditCheckpointReceipt>>;
}
