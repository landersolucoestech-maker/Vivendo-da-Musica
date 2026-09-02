export interface ApprovalReceipt {
  id: string;
  correlationId: string;
  workflowId: string;
  agentId: string;
  capability: string;
  approverId: string;
  approvedAt: string;
  expiresAt: string;
}

export class ApprovalReceiptStore {
  private readonly receipts = new Map<string, ApprovalReceipt>();

  issue(receipt: ApprovalReceipt): void {
    if (this.receipts.has(receipt.id)) throw new Error(`Approval receipt já existe: ${receipt.id}`);
    if (Date.parse(receipt.expiresAt) <= Date.parse(receipt.approvedAt)) {
      throw new Error('Approval receipt precisa expirar depois da aprovação.');
    }
    this.receipts.set(receipt.id, Object.freeze({ ...receipt }));
  }

  assertValid(receiptId: string, expected: Pick<ApprovalReceipt, 'workflowId' | 'agentId' | 'capability'>, now = new Date()): ApprovalReceipt {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) throw new Error(`Approval receipt inexistente: ${receiptId}`);
    if (receipt.workflowId !== expected.workflowId || receipt.agentId !== expected.agentId || receipt.capability !== expected.capability) {
      throw new Error('Approval receipt não corresponde à execução solicitada.');
    }
    if (Date.parse(receipt.expiresAt) <= now.getTime()) throw new Error(`Approval receipt expirado: ${receiptId}`);
    return receipt;
  }
}
