import type {
  DeploymentHealthRequest,
  DeploymentHealthResult,
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
  verifyHealth?(
    config: HostingerDeploymentConfig,
    request: DeploymentHealthRequest,
  ): Promise<DeploymentHealthResult>;
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

  async verifyHealth(request: DeploymentHealthRequest): Promise<DeploymentHealthResult> {
    if (!this.transport.verifyHealth) {
      throw new Error(`Health check não implementado para Hostinger no modo ${this.config.mode}.`);
    }
    const result = await this.transport.verifyHealth(this.config, request);
    if (result.deploymentId !== request.deploymentId) {
      throw new Error('Health check retornou deploymentId divergente.');
    }
    if (result.environment !== request.environment) {
      throw new Error('Health check retornou environment divergente.');
    }
    if (result.artifactRef !== request.artifactRef) {
      throw new Error('Health check retornou artifactRef divergente.');
    }
    if (!result.healthy) {
      throw new Error(`Deploy Hostinger não passou no health check: ${request.deploymentId}.`);
    }
    return Object.freeze({ ...result });
  }

  async rollback(request: DeploymentRequest & { deploymentId: string }): Promise<DeploymentResult> {
    if (!this.transport.rollback) {
      throw new Error(`Rollback não implementado para Hostinger no modo ${this.config.mode}.`);
    }
    if (!request.deploymentId.trim()) throw new Error('deploymentId obrigatório para rollback Hostinger.');
    return this.transport.rollback(this.config, request);
  }
}
