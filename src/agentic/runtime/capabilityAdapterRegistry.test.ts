import { describe, expect, it } from 'vitest';

import { CapabilityAdapterRegistry } from './capabilityAdapterRegistry';

describe('CapabilityAdapterRegistry', () => {
  it('fails closed for unknown capabilities', () => {
    const registry = new CapabilityAdapterRegistry();
    expect(() => registry.get('repo.write', 'write')).toThrow(
      'Nenhum adapter registrado para capability: repo.write',
    );
  });

  it('rejects duplicate adapters', () => {
    const registry = new CapabilityAdapterRegistry();
    const adapter = {
      capability: 'repo.read',
      allowedRisks: ['read'] as const,
      execute: async () => 'ok',
    };
    registry.register(adapter);
    expect(() => registry.register(adapter)).toThrow('Adapter já registrado: repo.read');
  });

  it('rejects a risk not declared by the adapter', () => {
    const registry = new CapabilityAdapterRegistry();
    registry.register({
      capability: 'repo.read',
      allowedRisks: ['read'],
      execute: async () => 'ok',
    });
    expect(() => registry.get('repo.read', 'write')).toThrow(
      'Risco write não autorizado pelo adapter repo.read.',
    );
  });
});
