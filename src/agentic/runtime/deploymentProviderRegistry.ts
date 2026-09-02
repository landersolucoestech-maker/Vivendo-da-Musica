export type DeploymentEnvironment = 'staging' | 'production';

export interface DeploymentRequest {
  environment: DeploymentEnvironment;
  artifactRef: string;
  correlationId: string;
  workflowId: string;
}

export interface DeploymentResult {
  deploymentId: string;
  environment: DeploymentEnvironment;
  artifactRef: string;
  url?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DeploymentProviderAdapter {
  id: string;
  deploy(request: DeploymentRequest): Promise<DeploymentResult>;
  rollback?(request: DeploymentRequest & { deploymentId: string }): Promise<DeploymentResult>;
}

export class DeploymentProviderRegistry {
  private readonly providers = new Map<string, DeploymentProviderAdapter>();
  private sealed = false;

  register(provider: DeploymentProviderAdapter): void {
    if (this.sealed) throw new Error('DeploymentProviderRegistry selado; novos providers não podem ser registrados.');
    const id = provider.id.trim().toLowerCase();
    if (!id) throw new Error('Deployment provider precisa de identificador.');
    if (provider.id !== id) {
      throw new Error(`Deployment provider id precisa estar normalizado: ${id}`);
    }
    if (this.providers.has(id)) throw new Error(`Deployment provider já registrado: ${id}`);

    // Preserve the original provider instance. Spreading a class instance would
    // strip prototype methods such as deploy()/rollback() and break execution.
    this.providers.set(id, provider);
  }

  seal(): void {
    this.sealed = true;
  }

  isSealed(): boolean {
    return this.sealed;
  }

  get(providerId: string): DeploymentProviderAdapter {
    const id = providerId.trim().toLowerCase();
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Deployment provider não registrado: ${id || '<vazio>'}`);
    return provider;
  }

  list(): string[] {
    return [...this.providers.keys()].sort();
  }
}
