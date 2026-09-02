import type { WorkflowSnapshot } from '@/agentic/workflow/workflowEngine';

export interface PersistedWorkflowSnapshot extends WorkflowSnapshot {
  revision: number;
  persistedAt: string;
}

export class WorkflowStore {
  private readonly snapshots = new Map<string, PersistedWorkflowSnapshot>();

  save(snapshot: WorkflowSnapshot, persistedAt = new Date().toISOString()): Readonly<PersistedWorkflowSnapshot> {
    const current = this.snapshots.get(snapshot.id);
    if (current && snapshot.stepsExecuted < current.stepsExecuted) {
      throw new Error(`Workflow não pode regredir stepsExecuted: ${snapshot.id}`);
    }
    if (current && current.state === 'completed' && snapshot.state !== 'completed') {
      throw new Error(`Workflow concluído é terminal: ${snapshot.id}`);
    }
    if (current && ['failed', 'cancelled'].includes(current.state) && snapshot.state !== current.state) {
      throw new Error(`Workflow terminal não pode ser reaberto: ${snapshot.id}`);
    }

    const persisted = Object.freeze({
      ...snapshot,
      revision: (current?.revision ?? 0) + 1,
      persistedAt,
    });
    this.snapshots.set(snapshot.id, persisted);
    return persisted;
  }

  get(workflowId: string): Readonly<PersistedWorkflowSnapshot> | null {
    const snapshot = this.snapshots.get(workflowId);
    return snapshot ? Object.freeze({ ...snapshot }) : null;
  }
}
