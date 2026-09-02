import { describe, expect, it, vi } from 'vitest';

import { createAgenticRuntime } from '@/agentic/runtime/createAgenticRuntime';

describe('createAgenticRuntime', () => {
  it('composes the complete governed runtime with the full specialist team', () => {
    const runtime = createAgenticRuntime();
    expect(runtime.registry.list()).toHaveLength(12);
    expect(runtime.evidence.verifyIntegrity()).toBe(true);
    expect(runtime.adapters.listCapabilities()).toEqual([]);
    expect(runtime.deploymentProviders.list()).toEqual([]);
  });

  it('registers Hostinger only when an explicit trusted deployment configuration is supplied', () => {
    const runtime = createAgenticRuntime({
      hostinger: {
        config: { mode: 'vps-docker', targetId: 'vm-123' },
        transport: { deploy: vi.fn() },
      },
    });

    expect(runtime.deploymentProviders.list()).toEqual(['hostinger']);
    expect(runtime.deploymentProviders.get('hostinger').id).toBe('hostinger');
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
