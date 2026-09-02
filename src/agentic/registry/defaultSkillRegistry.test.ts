import { describe, expect, it } from 'vitest';
import { createDefaultAgentRegistry } from '@/agentic/registry/defaultAgentRegistry';
import { createDefaultSkillRegistry } from '@/agentic/registry/defaultSkillRegistry';
import { SkillRegistry } from '@/agentic/registry/skillRegistry';

const allRisks = ['read', 'write', 'privileged', 'destructive'] as const;

describe('Default Skill Registry', () => {
  it('covers every declared agent capability with exactly one registered Skill', () => {
    const agents = createDefaultAgentRegistry();
    const skills = createDefaultSkillRegistry();

    for (const agent of agents.list()) {
      for (const capability of agent.capabilities) {
        const resolved = skills.resolve(capability, 'read');
        expect(resolved.allowed, `${agent.id}:${capability} -> ${resolved.reason}`).toBe(true);
        expect(resolved.skill).not.toBeNull();
      }
    }
  });

  it('fails closed when no Skill governs a capability', () => {
    const skills = createDefaultSkillRegistry();
    const resolved = skills.resolve('unknown.capability', 'read');

    expect(resolved.allowed).toBe(false);
    expect(resolved.skill).toBeNull();
    expect(resolved.reason).toContain('sem Skill registrada');
  });

  it('fails closed when more than one Skill governs the same capability', () => {
    const skills = new SkillRegistry();
    for (const id of ['first', 'second']) {
      skills.register({
        id,
        version: '1.0.0',
        name: id,
        objective: 'Teste de resolução ambígua.',
        enabled: true,
        capabilityPrefixes: ['repo.'],
        allowedRisks: [...allRisks],
        requiredEvidence: [],
      });
    }

    const resolved = skills.resolve('repo.read', 'read');
    expect(resolved.allowed).toBe(false);
    expect(resolved.skill).toBeNull();
    expect(resolved.reason).toContain('ambígua');
  });

  it('rejects a risk not authorized by the resolved Skill', () => {
    const skills = createDefaultSkillRegistry();
    const resolved = skills.resolve('security.audit', 'destructive');

    expect(resolved.allowed).toBe(false);
    expect(resolved.skill?.id).toBe('security-engineering');
  });
});
