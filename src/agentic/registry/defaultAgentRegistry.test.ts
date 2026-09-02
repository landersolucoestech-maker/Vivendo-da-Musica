import { describe, expect, it } from 'vitest';

import { createDefaultAgentRegistry } from './defaultAgentRegistry';

describe('createDefaultAgentRegistry', () => {
  it('registers the initial agent team with unique valid contracts', () => {
    const registry = createDefaultAgentRegistry();
    const agents = registry.list();

    expect(agents.map((agent) => agent.id)).toEqual([
      'engineering-orchestrator',
      'architecture-agent',
      'frontend-agent',
      'backend-agent',
      'database-agent',
      'security-agent',
      'qa-agent',
      'reviewer-agent',
    ]);
    expect(new Set(agents.map((agent) => agent.id)).size).toBe(agents.length);
  });

  it('keeps control agents unable to write implementation code', () => {
    const registry = createDefaultAgentRegistry();
    for (const agentId of ['architecture-agent', 'security-agent', 'qa-agent', 'reviewer-agent']) {
      expect(registry.get(agentId).deniedCapabilities).toContain('repo.write');
    }
  });

  it('keeps implementation agents unable to deploy directly to production', () => {
    const registry = createDefaultAgentRegistry();
    expect(registry.get('frontend-agent').deniedCapabilities).toContain('deploy.production');
    expect(registry.get('backend-agent').deniedCapabilities).toContain('deploy.production');
    expect(registry.get('database-agent').deniedCapabilities).toContain('database.migrate.production');
  });
});
