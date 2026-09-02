import type { CapabilityAdapter, CapabilityExecutionContext } from '@/agentic/runtime/capabilityAdapterRegistry';
import type {
  DeploymentHealthResult,
  DeploymentProviderRegistry,
  DeploymentResult,
} from '@/agentic/runtime/deploymentProviderRegistry';

export interface DeployArtifactInput {
  artifactRef: string;
}

export interface RollbackArtifactInput extends DeployArtifactInput {
  deploymentId: string;
}

interface VerifiedDeploymentResult extends DeploymentResult {
  health: DeploymentHealthResult | null;
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

const assertDeploymentBinding = (
  result: DeploymentResult,
  environment: 'staging' | 'production',
  artifactRef: string,
): void => {
  if (result.environment !== environment) throw new Error('Deployment retornou environment divergente.');
  if (result.artifactRef !== artifactRef) throw new Error('Deployment retornou artifactRef divergente.');
  if (!result.deploymentId.trim()) throw new Error('Deployment retornou deploymentId vazio.');
};

const healthEvidence = (providerId: string, output: VerifiedDeploymentResult) => {
  if (!output.health) return [];
  return [{
    kind: 'deployment_health' as const,
    payload: {
      providerId,
      deploymentId: output.health.deploymentId,
      environment: output.health.environment,
      artifactRef: output.health.artifactRef,
      healthy: output.health.healthy,
      checkedAt: output.health.checkedAt,
      statusCode: output.health.statusCode ?? null,
      url: output.health.url ?? null,
    },
  }];
};

export const createDeploymentCapabilityAdapters = (
  providers: DeploymentProviderRegistry,
  providerId = 'hostinger',
): CapabilityAdapter[] => {
  const deploy = (
    capability: 'deploy.staging' | 'deploy.production',
    environment: 'staging' | 'production',
  ): CapabilityAdapter<DeployArtifactInput, VerifiedDeploymentResult> => ({
    capability,
    allowedRisks: ['privileged'],
    validateResource(_input, resource) {
      assertProviderResource(providers, providerId, resource);
    },
    async execute(input: DeployArtifactInput, context: CapabilityExecutionContext) {
      const provider = providers.get(providerId);
      const artifactRef = assertArtifactRef(input.artifactRef);
      const request = {
        environment,
        artifactRef,
        correlationId: context.correlationId,
        workflowId: context.workflowId,
      };
      const deployment = await provider.deploy(request);
      assertDeploymentBinding(deployment, environment, artifactRef);

      if (environment !== 'production') return { ...deployment, health: null };
      if (!provider.verifyHealth) {
        throw new Error(`Health check obrigatório não suportado pelo deployment provider: ${providerId}`);
      }
      const health = await provider.verifyHealth({
        ...request,
        deploymentId: deployment.deploymentId,
        url: deployment.url,
      });
      return { ...deployment, health };
    },
    evidence(_input, output) {
      return healthEvidence(providerId, output);
    },
  });

  const rollback: CapabilityAdapter<RollbackArtifactInput, VerifiedDeploymentResult> = {
    capability: 'rollback.production',
    allowedRisks: ['destructive'],
    validateResource(_input, resource) {
      assertProviderResource(providers, providerId, resource);
    },
    async execute(input: RollbackArtifactInput, context: CapabilityExecutionContext) {
      const provider = providers.get(providerId);
      if (!provider.rollback) throw new Error(`Rollback não suportado pelo deployment provider: ${providerId}`);
      if (!provider.verifyHealth) throw new Error(`Health check obrigatório não suportado pelo deployment provider: ${providerId}`);
      const deploymentId = input.deploymentId.trim();
      if (!deploymentId) throw new Error('deploymentId obrigatório para rollback.');
      const artifactRef = assertArtifactRef(input.artifactRef);
      const request = {
        environment: 'production' as const,
        artifactRef,
        correlationId: context.correlationId,
        workflowId: context.workflowId,
      };
      const deployment = await provider.rollback({ ...request, deploymentId });
      assertDeploymentBinding(deployment, 'production', artifactRef);
      const health = await provider.verifyHealth({
        ...request,
        deploymentId: deployment.deploymentId,
        url: deployment.url,
      });
      return { ...deployment, health };
    },
    evidence(_input, output) {
      return healthEvidence(providerId, output);
    },
  };

  return [deploy('deploy.staging', 'staging'), deploy('deploy.production', 'production'), rollback];
};
