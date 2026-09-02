import { describe, expect, it, vi } from 'vitest';
import { createToolBroker } from '../../scripts/engineering-os/tool-broker.mjs';
import { runSkill } from '../../scripts/engineering-os/skill-runner.mjs';

const evidence = (kind: 'artifact' | 'diff' | 'review' | 'test') => ({
  kind,
  source: `skill-test:${kind}`,
  result: 'verified',
  timestamp: new Date().toISOString()
});

describe('Engineering OS skill runner', () => {
  it('allows only tools declared by the assigned skill and requires its evidence contract', async () => {
    const read = vi.fn(async () => ({ files: 42 }));
    const broker = createToolBroker({ adapters: { 'repository.read': read } });

    const result = await runSkill({
      runId: 'skill-run-1',
      agentId: 'repo-archaeologist',
      skillId: 'repository-inventory',
      broker,
      input: { root: '.' },
      handler: async ({ callTool }) => {
        await callTool({ toolId: 'repository.read', operation: 'inventory', input: { root: '.' } });
        return { output: { inventoried: true }, evidence: [evidence('artifact')] };
      }
    });

    expect(result.output).toEqual({ inventoried: true });
    expect(result.calls).toHaveLength(1);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('rejects tools outside the skill allowlist', async () => {
    const broker = createToolBroker({
      adapters: {
        'repository.read': async () => ({}),
        'repository.write-source': async () => ({})
      }
    });

    await expect(runSkill({
      runId: 'skill-run-2',
      agentId: 'repo-archaeologist',
      skillId: 'repository-inventory',
      broker,
      handler: async ({ callTool }) => {
        await callTool({
          toolId: 'repository.write-source',
          operation: 'write-source',
          input: {},
          resource: 'src/App.tsx',
          idempotencyKey: 'forbidden-write'
        });
        return { evidence: [evidence('artifact')] };
      }
    })).rejects.toThrow(/Tool not allowed by skill/);
  });

  it('rejects execution when the agent was not assigned the requested skill', async () => {
    const broker = createToolBroker();
    await expect(runSkill({
      runId: 'skill-run-3',
      agentId: 'frontend-engineer',
      skillId: 'payment-safety',
      broker,
      handler: async () => ({ evidence: [] })
    })).rejects.toThrow(/Skill not assigned to agent/);
  });

  it('rejects a successful-looking result that omits mandatory evidence kinds', async () => {
    const broker = createToolBroker({ adapters: { 'repository.read': async () => ({}) } });
    await expect(runSkill({
      runId: 'skill-run-4',
      agentId: 'architect',
      skillId: 'architecture-design',
      broker,
      handler: async () => ({ output: { claimedComplete: true }, evidence: [evidence('artifact')] })
    })).rejects.toThrow(/missing required evidence kind: architecture-design\/review/i);
  });
});
