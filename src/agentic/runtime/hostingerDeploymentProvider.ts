import type {
  DeploymentProviderAdapter,
  DeploymentRequest,
  DeploymentResult,
} from '@/agentic/runtime/deploymentProviderRegistry';

export type HostingerDeploymentMode = 'vps-docker' | 'web-app';

export interface HostingerDeploymentConfig {
  mode: HostingerDeploymentMode;
  targetId: string;
}

export interface HostingerDeploymentTransport {
  deploy(config: HostingerDeploymentConfig, request: DeploymentRequest): Promise<DeploymentResult>;
  rollback?(config: HostingerDeploymentConfig, request: DeploymentRequest & { deploymentId: string }): Promise<DeploymentResult>;
}

export class HostingerDeploymentProvider implements DeploymentProviderAdapter {
  readonly id = 'hostinger';
  readonly resourceId: string;

  constructor(
    private readonly config: HostingerDeploymentConfig,
    private readonly transport: HostingerDeploymentTransport,
  ) {
    const targetId = config.targetId.trim();
    if (!targetId) throw new Error('Hostinger targetId obrigatório.');
    this.resourceId = `hostinger:target:${targetId}`;
  }

  deploy(request: DeploymentRequest): Promise<DeploymentResult> {
    if (!request.artifactRef.trim()) throw new Error('Artifact ref obrigatório para deploy Hostinger.');
    return this.transport.deploy(this.config, request);
  }

  async rollback(request: DeploymentRequest & { deploymentId: string }): Promise<DeploymentResult> {
    if (!this.transport.rollback) {
      throw new Error(`Rollback não implementado para Hostinger no modo ${this.config.mode}.`);
    }
    if (!request.deploymentId.trim()) throw new Error('deploymentId obrigatório para rollback Hostinger.');
    return this.transport.rollback(this.config, request);
  }
}
