import { getAgent, fingerprint } from './runtime.mjs';
import { getSkill, runSkill } from './skill-runner.mjs';

export const createAgentHandlerRegistry = ({ broker, strategies = {} } = {}) => {
  if (!broker) throw new Error('Agent handler registry requires a tool broker');
  const handlers = new Map();

  const register = ({ agentId, skillId, strategy }) => {
    const agent = getAgent(agentId);
    getSkill(skillId);
    if (!(agent.skills ?? []).includes(skillId)) throw new Error(`Skill not assigned to agent: ${agentId}/${skillId}`);
    if (typeof strategy !== 'function') throw new Error(`Agent strategy must be a function: ${agentId}/${skillId}`);
    if (handlers.has(agentId)) throw new Error(`Agent handler already registered: ${agentId}`);

    const handler = async ({ run, step }) => {
      if (step.agentId !== agentId) throw new Error(`Handler agent mismatch: ${agentId}/${step.agentId}`);
      if (step.skillId !== skillId) throw new Error(`Handler skill mismatch: ${agentId}/${skillId}/${step.skillId}`);
      const result = await runSkill({
        runId: run.id,
        agentId,
        skillId,
        broker,
        input: {
          workflowId: run.workflowId,
          stepId: step.stepId,
          metadata: structuredClone(run.metadata ?? {})
        },
        handler: async ({ input, callTool, agent: runtimeAgent, skill: runtimeSkill }) => strategy({
          run: structuredClone(run),
          step: structuredClone(step),
          input,
          agent: runtimeAgent,
          skill: runtimeSkill,
          callTool
        })
      });

      const output = result.output ?? null;
      const evidence = result.evidence ?? [];
      const gates = Object.fromEntries((step.gates ?? []).map((gateId) => [gateId, {
        status: 'passed',
        reason: `skill:${skillId}:completed`
      }]));
      return { output, evidence, gates, skillFingerprint: result.fingerprint, outputFingerprint: fingerprint(output) };
    };

    handlers.set(agentId, handler);
    return handler;
  };

  for (const [agentId, specification] of Object.entries(strategies)) {
    register({ agentId, skillId: specification.skillId, strategy: specification.run });
  }

  return {
    register,
    get(agentId) {
      const handler = handlers.get(agentId);
      if (!handler) throw new Error(`No executable handler registered: ${agentId}`);
      return handler;
    },
    has(agentId) {
      return handlers.has(agentId);
    },
    toObject() {
      return Object.fromEntries(handlers.entries());
    }
  };
};
