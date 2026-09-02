import { getAgent, loadWorkflow } from './runtime.mjs';
import { decideOperation } from './policy-engine.mjs';

export const buildDispatchPlan = ({ workflowId, runId = null, approvalLedger = null }) => {
  const workflow = loadWorkflow(workflowId);
  const plan = [];

  for (const step of workflow.steps ?? []) {
    const agent = getAgent(step.agent);
    const scope = step.scope ?? 'read';
    const operation = step.operation ?? step.id;
    const authorization = decideOperation({
      agentId: agent.id,
      scope,
      operation,
      runId,
      approvalLedger,
      toolId: null
    });

    plan.push({
      stepId: step.id,
      agentId: agent.id,
      risk: agent.risk,
      scope,
      operation,
      required: Boolean(step.required),
      gates: [...(step.gates ?? [])],
      authorization
    });
  }

  return {
    workflowId,
    executable: plan.every((step) => step.authorization.allowed),
    steps: plan
  };
};

export const selectNextStep = ({ run, workflowId, approvalLedger = null }) => {
  const plan = buildDispatchPlan({ workflowId, runId: run.id, approvalLedger });
  for (const item of plan.steps) {
    const state = run.steps[item.stepId];
    if (state?.status === 'completed') continue;
    if (!item.authorization.allowed) return { type: 'blocked', step: item, reason: item.authorization.reason };
    return { type: 'dispatch', step: item };
  }
  return { type: 'none', reason: 'workflow-steps-exhausted' };
};
