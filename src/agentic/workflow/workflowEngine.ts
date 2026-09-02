export type WorkflowState =
  | 'investigating'
  | 'planned'
  | 'awaiting_approval'
  | 'approved'
  | 'executing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowSnapshot {
  id: string;
  state: WorkflowState;
  stepsExecuted: number;
  maxSteps: number;
  verified: boolean;
  failureReason: string | null;
}

const transitions: Record<WorkflowState, readonly WorkflowState[]> = {
  investigating: ['planned', 'failed', 'cancelled'],
  planned: ['awaiting_approval', 'approved', 'failed', 'cancelled'],
  awaiting_approval: ['approved', 'failed', 'cancelled'],
  approved: ['executing', 'failed', 'cancelled'],
  executing: ['verifying', 'failed', 'cancelled'],
  verifying: ['completed', 'executing', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

export class WorkflowEngine {
  private snapshot: WorkflowSnapshot;

  constructor(id: string, maxSteps: number) {
    if (!id.trim()) throw new Error('Workflow precisa de um identificador.');
    if (!Number.isInteger(maxSteps) || maxSteps <= 0) throw new Error('maxSteps precisa ser inteiro positivo.');
    this.snapshot = {
      id,
      state: 'investigating',
      stepsExecuted: 0,
      maxSteps,
      verified: false,
      failureReason: null,
    };
  }

  static restore(snapshot: WorkflowSnapshot): WorkflowEngine {
    if (!snapshot.id.trim()) throw new Error('Workflow persistido sem identificador.');
    if (!Number.isInteger(snapshot.maxSteps) || snapshot.maxSteps <= 0) throw new Error('Workflow persistido com maxSteps inválido.');
    if (!Number.isInteger(snapshot.stepsExecuted) || snapshot.stepsExecuted < 0 || snapshot.stepsExecuted > snapshot.maxSteps) {
      throw new Error('Workflow persistido com stepsExecuted inválido.');
    }
    const engine = new WorkflowEngine(snapshot.id, snapshot.maxSteps);
    engine.snapshot = { ...snapshot };
    return engine;
  }

  current(): Readonly<WorkflowSnapshot> {
    return Object.freeze({ ...this.snapshot });
  }

  transition(next: WorkflowState): Readonly<WorkflowSnapshot> {
    if (!transitions[this.snapshot.state].includes(next)) {
      throw new Error(`Transição inválida: ${this.snapshot.state} -> ${next}`);
    }
    if (next === 'completed' && !this.snapshot.verified) {
      throw new Error('Workflow não pode ser concluído sem verificação aprovada.');
    }
    this.snapshot = { ...this.snapshot, state: next };
    return this.current();
  }

  consumeStep(): Readonly<WorkflowSnapshot> {
    const nextCount = this.snapshot.stepsExecuted + 1;
    if (nextCount > this.snapshot.maxSteps) {
      this.snapshot = {
        ...this.snapshot,
        state: 'failed',
        failureReason: `Budget de passos excedido (${this.snapshot.maxSteps}).`,
      };
      throw new Error(this.snapshot.failureReason);
    }
    this.snapshot = { ...this.snapshot, stepsExecuted: nextCount };
    return this.current();
  }

  recordVerification(passed: boolean, reason?: string): Readonly<WorkflowSnapshot> {
    if (this.snapshot.state !== 'verifying') {
      throw new Error('Verificação só pode ser registrada no estado verifying.');
    }
    if (!passed) {
      this.snapshot = {
        ...this.snapshot,
        verified: false,
        state: 'failed',
        failureReason: reason?.trim() || 'Verificação falhou.',
      };
      return this.current();
    }
    this.snapshot = { ...this.snapshot, verified: true, failureReason: null };
    return this.current();
  }
}
