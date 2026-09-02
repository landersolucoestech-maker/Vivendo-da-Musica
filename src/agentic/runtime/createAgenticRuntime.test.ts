import { describe, expect, it } from 'vitest';

import { createAgenticRuntime } from '@/agentic/runtime/createAgenticRuntime';

describe('createAgenticRuntime', () => {
  it('composes the complete governed runtime with the full specialist team', () => {
    const runtime = createAgenticRuntime();
    expect(runtime.registry.list()).toHaveLength(12);
    expect(runtime.evidence.verifyIntegrity()).toBe(true);
    expect(runtime.adapters.listCapabilities()).toEqual([]);
  });

  it('allows declared reads and requires human approval for privileged risk by default', () => {
    const runtime = createAgenticRuntime();
    expect(runtime.policies.evaluate({
      agentId: 'engineering-orchestrator', capability: 'repo.read', risk: 'read', approvedByHuman: false,
    }).allowed).toBe(true);

    const privileged = runtime.policies.evaluate({
      agentId: 'release-agent', capability: 'deploy.production', risk: 'privileged', approvedByHuman: false,
    });
    expect(privileged.effect).toBe('require_approval');
    expect(privileged.allowed).toBe(false);
  });

  it('keeps adapters fail-closed until a trusted capability implementation is explicitly registered', () => {
    const runtime = createAgenticRuntime();
    expect(() => runtime.adapters.get('repo.write', 'write')).toThrow('Nenhum adapter registrado');
  });
});
