import type { AgentRisk } from '@/agentic/contracts/agentContract';
import type {
  AuditCheckpointContext,
  AuditCheckpointReceipt,
  AuditCheckpointTransport,
} from '@/agentic/evidence/auditCheckpointTransport';
import { EvidenceStore } from '@/agentic/evidence/evidenceStore';

const requiresDurableAudit = (risk: AgentRisk): boolean => risk === 'privileged' || risk === 'destructive';
const sha256Pattern = /^[0-9a-f]{64}$/;

const assertReceipt = (
  receipt: Readonly<AuditCheckpointReceipt>,
  headHash: string | null,
  recordCount: number,
): void => {
  if (!receipt.persistenceId.trim()) throw new Error('Audit checkpoint receipt sem persistenceId.');
  if (!receipt.persistedAt.trim() || Number.isNaN(Date.parse(receipt.persistedAt))) {
    throw new Error('Audit checkpoint receipt com persistedAt inválido.');
  }
  if (receipt.headHash !== headHash) throw new Error('Audit checkpoint receipt com headHash divergente.');
  if (receipt.recordCount !== recordCount) throw new Error('Audit checkpoint receipt com recordCount divergente.');
  if (receipt.checkpointDigest !== undefined && !sha256Pattern.test(receipt.checkpointDigest)) {
    throw new Error('Audit checkpoint receipt com checkpointDigest inválido.');
  }
};

export class AuditCheckpointGate {
  private readonly receipts: AuditCheckpointReceipt[] = [];

  constructor(
    private readonly evidence: EvidenceStore,
    private readonly transport?: AuditCheckpointTransport,
  ) {}

  async persistIfRequired(context: Readonly<AuditCheckpointContext>): Promise<Readonly<AuditCheckpointReceipt> | null> {
    if (!requiresDurableAudit(context.risk)) return null;
    if (!this.transport) {
      throw new Error(`Audit checkpoint transport obrigatório para risco ${context.risk}.`);
    }

    const checkpoint = this.evidence.checkpoint();
    const receipt = await this.transport.persist(checkpoint, Object.freeze({ ...context }));
    assertReceipt(receipt, checkpoint.headHash, checkpoint.recordCount);
    const frozen = Object.freeze({ ...receipt });
    this.receipts.push(frozen);
    return frozen;
  }

  allReceipts(): readonly AuditCheckpointReceipt[] {
    return Object.freeze([...this.receipts]);
  }
}
