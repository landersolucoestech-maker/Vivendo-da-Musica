import { authorize, getAgent, loadWorkflow } from './runtime.mjs';

export const buildDispatchPlan = ({ workflowId, approvals = [] }) => {
  const workflow = loadWorkflow(workflowId);
  const plan = [];

  for (const step of workflow.steps ?? []) {
    const agent = getAgent(step.agent);
    const scope = step.scope ?? 'read';
    const operation = step.operation ?? step.id;
    const auth = authorize({ agentId: agent.id, scope, operation, approvals });

    plan.push({
      stepId: step.id,
      agentId: agent.id,
      risk: agent.risk,
      required: Boolean(step.required),
      gates: [...(step.gates ?? [])],
      authorization: auth,
    });
  }

  return {
    workflowId,
    executable: plan.every((step) => step.authorization.allowed),
    steps: plan,
  };
};

export const selectNextStep = ({ run, workflowId, approvals = [] }) => {
  const plan = buildDispatchPlan({ workflowId, approvals });
  for (const item of plan.steps) {
    const state = run.steps[item.stepId];
    if (state?.status === 'completed') continue;
    if (!item.authorization.allowed) {
      return { type: 'blocked', step: item, reason: item.authorization.reason };
    }
    return { type: 'dispatch', step: item };
  }
  return { type: 'none', reason: 'workflow-steps-exhausted' };
};
