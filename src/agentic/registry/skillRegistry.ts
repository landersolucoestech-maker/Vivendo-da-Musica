import { skillContractSchema, type SkillContract, type SkillResolution } from '@/agentic/contracts/skillContract';
import type { AgentRisk } from '@/agentic/contracts/agentContract';

export class SkillRegistry {
  private readonly skills = new Map<string, SkillContract>();
  private sealed = false;

  register(input: SkillContract): SkillContract {
    if (this.sealed) throw new Error('SkillRegistry selado; novas skills não podem ser registradas.');
    const skill = skillContractSchema.parse(input);
    if (this.skills.has(skill.id)) throw new Error(`Skill já registrada: ${skill.id}`);
    this.skills.set(skill.id, skill);
    return skill;
  }

  seal(): void {
    this.sealed = true;
  }

  isSealed(): boolean {
    return this.sealed;
  }

  get(skillId: string): SkillContract {
    const skill = this.skills.get(skillId);
    if (!skill) throw new Error(`Skill não registrada: ${skillId}`);
    if (!skill.enabled) throw new Error(`Skill desabilitada: ${skillId}`);
    return skill;
  }

  list(): SkillContract[] {
    return [...this.skills.values()];
  }

  resolve(capability: string, risk: AgentRisk): SkillResolution {
    const matches = this.list().filter(
      (skill) => skill.enabled && skill.capabilityPrefixes.some((prefix) => capability.startsWith(prefix)),
    );

    if (matches.length === 0) {
      return { allowed: false, reason: `Capability sem Skill registrada: ${capability}`, skill: null };
    }
    if (matches.length > 1) {
      return {
        allowed: false,
        reason: `Capability com resolução ambígua de Skill: ${capability}`,
        skill: null,
      };
    }

    const skill = matches[0]!;
    if (!skill.allowedRisks.includes(risk)) {
      return {
        allowed: false,
        reason: `Skill ${skill.id} não autoriza risco ${risk} para ${capability}.`,
        skill,
      };
    }

    return { allowed: true, reason: `Skill ${skill.id} autorizou a capability.`, skill };
  }
}
