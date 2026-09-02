import type { CapabilityAdapter, CapabilityExecutionContext } from '@/agentic/runtime/capabilityAdapterRegistry';
import type { DeploymentProviderRegistry } from '@/agentic/runtime/deploymentProviderRegistry';

export interface DeployArtifactInput {
  artifactRef: string;
}

export interface RollbackArtifactInput extends DeployArtifactInput {
  deploymentId: string;
}

const assertArtifactRef = (artifactRef: string): string => {
  const value = artifactRef.trim();
  if (!value) throw new Error('artifactRef obrigatório para operação de deploy.');
  return value;
};

const assertProviderResource = (providers: DeploymentProviderRegistry, providerId: string, resource: string): void => {
  const expected = providers.get(providerId).resourceId;
  if (resource !== expected) {
    throw new Error(`Resource de deploy divergente do target configurado: esperado ${expected}.`);
  }
};

export const createDeploymentCapabilityAdapters = (
  providers: DeploymentProviderRegistry,
  providerId = 'hostinger',
): CapabilityAdapter[] => {
  const deploy = (
    capability: 'deploy.staging' | 'deploy.production',
    environment: 'staging' | 'production',
  ): CapabilityAdapter<DeployArtifactInput> => ({
    capability,
    allowedRisks: ['privileged'],
    validateResource(_input, resource) {
      assertProviderResource(providers, providerId, resource);
    },
    async execute(input: DeployArtifactInput, context: CapabilityExecutionContext) {
      const provider = providers.get(providerId);
      return provider.deploy({
        environment,
        artifactRef: assertArtifactRef(input.artifactRef),
        correlationId: context.correlationId,
        workflowId: context.workflowId,
      });
    },
  });

  const rollback: CapabilityAdapter<RollbackArtifactInput> = {
    capability: 'rollback.production',
    allowedRisks: ['destructive'],
    validateResource(_input, resource) {
      assertProviderResource(providers, providerId, resource);
    },
    async execute(input: RollbackArtifactInput, context: CapabilityExecutionContext) {
      const provider = providers.get(providerId);
      if (!provider.rollback) throw new Error(`Rollback não suportado pelo deployment provider: ${providerId}`);
      const deploymentId = input.deploymentId.trim();
      if (!deploymentId) throw new Error('deploymentId obrigatório para rollback.');
      return provider.rollback({
        environment: 'production',
        artifactRef: assertArtifactRef(input.artifactRef),
        deploymentId,
        correlationId: context.correlationId,
        workflowId: context.workflowId,
      });
    },
  };

  return [deploy('deploy.staging', 'staging'), deploy('deploy.production', 'production'), rollback];
};
