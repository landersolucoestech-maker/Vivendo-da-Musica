import { describe, expect, it } from 'vitest';

import { WorkflowEngine } from './workflowEngine';

describe('WorkflowEngine', () => {
  it('rejects invalid state transitions', () => {
    const workflow = new WorkflowEngine('wf-1', 3);
    expect(() => workflow.transition('executing')).toThrow('Transição inválida');
  });

  it('cannot complete without successful verification', () => {
    const workflow = new WorkflowEngine('wf-2', 4);
    workflow.transition('planned');
    workflow.transition('approved');
    workflow.transition('executing');
    workflow.transition('verifying');
    expect(() => workflow.transition('completed')).toThrow(
      'Workflow não pode ser concluído sem verificação aprovada.',
    );
  });

  it('completes only after verification passes', () => {
    const workflow = new WorkflowEngine('wf-3', 4);
    workflow.transition('planned');
    workflow.transition('approved');
    workflow.transition('executing');
    workflow.transition('verifying');
    workflow.recordVerification(true);
    expect(workflow.transition('completed').state).toBe('completed');
  });

  it('fails closed when step budget is exceeded', () => {
    const workflow = new WorkflowEngine('wf-4', 1);
    workflow.consumeStep();
    expect(() => workflow.consumeStep()).toThrow('Budget de passos excedido (1).');
    expect(workflow.current().state).toBe('failed');
  });
});
