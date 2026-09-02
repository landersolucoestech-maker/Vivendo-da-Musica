import { describe, expect, it, vi } from 'vitest';

import { DeploymentProviderRegistry } from '@/agentic/runtime/deploymentProviderRegistry';
import { HostingerDeploymentProvider } from '@/agentic/runtime/hostingerDeploymentProvider';

const request = {
  environment: 'staging' as const,
  artifactRef: 'ghcr.io/example/app:sha',
  correlationId: 'corr-1',
  workflowId: 'wf-1',
};

describe('HostingerDeploymentProvider', () => {
  it('delegates deployment through the configured Hostinger transport', async () => {
    const deploy = vi.fn().mockResolvedValue({
      deploymentId: 'dep-1', environment: 'staging', artifactRef: request.artifactRef,
    });
    const provider = new HostingerDeploymentProvider(
      { mode: 'vps-docker', targetId: 'vm-123' },
      { deploy },
    );

    await expect(provider.deploy(request)).resolves.toMatchObject({ deploymentId: 'dep-1' });
    expect(deploy).toHaveBeenCalledWith({ mode: 'vps-docker', targetId: 'vm-123' }, request);
  });

  it('preserves class prototype methods after provider registration', async () => {
    const deploy = vi.fn().mockResolvedValue({
      deploymentId: 'dep-registry', environment: 'staging', artifactRef: request.artifactRef,
    });
    const provider = new HostingerDeploymentProvider(
      { mode: 'vps-docker', targetId: 'vm-123' },
      { deploy },
    );
    const registry = new DeploymentProviderRegistry();

    registry.register(provider);

    expect(registry.get('hostinger')).toBe(provider);
    await expect(registry.get('hostinger').deploy(request)).resolves.toMatchObject({
      deploymentId: 'dep-registry',
    });
    expect(deploy).toHaveBeenCalledWith({ mode: 'vps-docker', targetId: 'vm-123' }, request);
  });

  it('fails closed when rollback transport is unavailable', async () => {
    const provider = new HostingerDeploymentProvider(
      { mode: 'web-app', targetId: 'app-123' },
      { deploy: vi.fn() },
    );

    await expect(provider.rollback({ ...request, deploymentId: 'dep-1' }))
      .rejects.toThrow('Rollback não implementado');
  });
});
