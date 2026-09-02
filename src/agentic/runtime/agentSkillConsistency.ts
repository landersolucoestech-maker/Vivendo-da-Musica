import type { AgentRegistry } from '@/agentic/registry/agentRegistry';
import type { SkillRegistry } from '@/agentic/registry/skillRegistry';

export const assertAgentSkillConsistency = (
  agents: AgentRegistry,
  skills: SkillRegistry,
): void => {
  const knownSkills = skills.list();

  for (const agent of agents.list()) {
    for (const skillId of agent.skillIds) {
      try {
        skills.get(skillId);
      } catch (error) {
        throw new Error(
          `Agent ${agent.id} references unavailable Skill ${skillId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    for (const capability of agent.capabilities) {
      if (agent.deniedCapabilities.includes(capability)) continue;

      const matches = knownSkills.filter(
        (skill) =>
          skill.enabled &&
          skill.capabilityPrefixes.some((prefix) => capability.startsWith(prefix)),
      );

      if (matches.length !== 1) {
        throw new Error(
          `Capability ${agent.id}:${capability} must resolve to exactly one Skill; found ${matches.length}.`,
        );
      }

      const resolvedSkill = matches[0]!;
      if (!agent.skillIds.includes(resolvedSkill.id)) {
        throw new Error(
          `Capability ${agent.id}:${capability} resolves to unassigned Skill ${resolvedSkill.id}.`,
        );
      }
    }
  }
};
