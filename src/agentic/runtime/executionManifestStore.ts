import {
  canonicalizeExecutionManifest,
  executionManifestSchema,
  type ExecutionManifest,
  type ExecutionManifestInput,
  type ExecutionManifestIntegrityVerifier,
  type ExecutionManifestSignatureVerifier,
  type ManifestExecutionContext,
} from '@/agentic/contracts/executionManifest';

interface ManifestConsumptionContext extends ManifestExecutionContext {
  executionNonce: string;
  idempotencyKey: string;
}

interface NonceBinding {
  manifestId: string;
  correlationId: string;
  workflowId: string;
  agentId: string;
  capability: string;
  risk: ManifestExecutionContext['risk'];
  resource: string;
  artifactRef: string | null;
  idempotencyKey: string;
}

const requiresStrongIntegrity = (risk: ManifestExecutionContext['risk']): boolean =>
  risk === 'privileged' || risk === 'destructive';

const resourceMatches = (scope: string, resource: string): boolean => {
  if (scope === resource) return true;
  if (!scope.endsWith('*')) return false;
  return resource.startsWith(scope.slice(0, -1));
};

const freezeManifest = (manifest: ExecutionManifest): ExecutionManifest => Object.freeze({
  ...manifest,
  allowedResources: Object.freeze([...manifest.allowedResources]),
  requiredEvidenceKinds: Object.freeze([...manifest.requiredEvidenceKinds]),
});

const assertReleasePolicy = (manifest: ExecutionManifest): void => {
  const isProductionRelease = manifest.capability === 'deploy.production' || manifest.capability === 'rollback.production';
  if (!isProductionRelease) return;

  if (manifest.environment !== 'production') {
    throw new Error(`Manifesto de release de produção precisa declarar environment=production: ${manifest.id}`);
  }
  if (!manifest.artifactRef) {
    throw new Error(`Manifesto de release de produção precisa fixar artifactRef: ${manifest.id}`);
  }
  if (!manifest.integrityDigest) {
    throw new Error(`Manifesto de produção precisa fixar integrityDigest: ${manifest.id}`);
  }
  if (!manifest.allowedResources.some((scope) => scope.startsWith('hostinger:target:') && !scope.endsWith('*'))) {
    throw new Error(`Manifesto de produção precisa fixar um target Hostinger exato: ${manifest.id}`);
  }
  const required = ['tool_call', 'tool_result', 'verification'] as const;
  const missing = required.filter((kind) => !manifest.requiredEvidenceKinds.includes(kind));
  if (missing.length > 0) {
    throw new Error(`Manifesto de produção sem evidências obrigatórias: ${missing.join(', ')}`);
  }
};

const sameBinding = (left: NonceBinding, right: NonceBinding): boolean =>
  left.manifestId === right.manifestId
  && left.correlationId === right.correlationId
  && left.workflowId === right.workflowId
  && left.agentId === right.agentId
  && left.capability === right.capability
  && left.risk === right.risk
  && left.resource === right.resource
  && left.artifactRef === right.artifactRef
  && left.idempotencyKey === right.idempotencyKey;

export class ExecutionManifestStore {
  private readonly manifests = new Map<string, ExecutionManifest>();
  private readonly executions = new Map<string, number>();
  private readonly nonceBindings = new Map<string, NonceBinding>();

  constructor(
    private readonly signatureVerifier?: ExecutionManifestSignatureVerifier,
    private readonly integrityVerifier?: ExecutionManifestIntegrityVerifier,
  ) {}

  issue(input: ExecutionManifestInput): ExecutionManifest {
    const manifest = executionManifestSchema.parse(input) as ExecutionManifest;
    if (Date.parse(manifest.expiresAt) <= Date.parse(manifest.issuedAt)) {
      throw new Error(`Execution Manifest expira antes ou no instante da emissão: ${manifest.id}`);
    }
    if (this.manifests.has(manifest.id)) throw new Error(`Execution Manifest já existe: ${manifest.id}`);
    assertReleasePolicy(manifest);
    const frozen = freezeManifest(manifest);
    this.manifests.set(manifest.id, frozen);
    return frozen;
  }

  get(manifestId: string): ExecutionManifest {
    const manifest = this.manifests.get(manifestId);
    if (!manifest) throw new Error(`Execution Manifest não encontrado: ${manifestId}`);
    return manifest;
  }

  assertAndConsume(manifestId: string, context: ManifestConsumptionContext, now = new Date()): ExecutionManifest {
    const manifest = this.get(manifestId);
    const executionNonce = context.executionNonce.trim();
    const idempotencyKey = context.idempotencyKey.trim();
    if (!executionNonce) throw new Error('Execution nonce obrigatório.');
    if (!idempotencyKey) throw new Error('Idempotency key obrigatória para consumir Execution Manifest.');

    if (manifest.correlationId !== context.correlationId) throw new Error('Manifest correlationId divergente.');
    if (manifest.workflowId !== context.workflowId) throw new Error('Manifest workflowId divergente.');
    if (manifest.agentId !== context.agentId) throw new Error('Manifest agentId divergente.');
    if (manifest.capability !== context.capability) throw new Error('Manifest capability divergente.');
    if (manifest.risk !== context.risk) throw new Error('Manifest risk divergente.');
    if (Date.parse(manifest.expiresAt) <= now.getTime()) throw new Error(`Execution Manifest expirado: ${manifest.id}`);
    if (!manifest.allowedResources.some((scope) => resourceMatches(scope, context.resource))) {
      throw new Error(`Recurso fora do escopo do Execution Manifest: ${context.resource}`);
    }
    if (manifest.artifactRef && manifest.artifactRef !== (context.artifactRef ?? null)) {
      throw new Error('Artifact ref divergente do Execution Manifest.');
    }

    const mustVerifyIntegrity = requiresStrongIntegrity(context.risk) || Boolean(manifest.integrityDigest);
    if (mustVerifyIntegrity) {
      if (!manifest.integrityDigest) {
        throw new Error(`Integrity digest obrigatório para risco ${context.risk}.`);
      }
      if (!this.integrityVerifier) {
        throw new Error('Verifier de integridade do Execution Manifest não configurado.');
      }
      const canonicalPayload = canonicalizeExecutionManifest(manifest);
      if (!this.integrityVerifier.verify(canonicalPayload, manifest.integrityDigest)) {
        throw new Error('Integrity digest do Execution Manifest inválido.');
      }
    }

    if (requiresStrongIntegrity(context.risk)) {
      if (!manifest.signature) throw new Error(`Execution Manifest assinado é obrigatório para risco ${context.risk}.`);
      if (!this.signatureVerifier) throw new Error('Verifier de assinatura do Execution Manifest não configurado.');
      if (!this.signatureVerifier.verify(manifest)) throw new Error('Assinatura do Execution Manifest inválida.');
    }

    const binding: NonceBinding = {
      manifestId,
      correlationId: context.correlationId,
      workflowId: context.workflowId,
      agentId: context.agentId,
      capability: context.capability,
      risk: context.risk,
      resource: context.resource,
      artifactRef: context.artifactRef ?? null,
      idempotencyKey,
    };
    const existingBinding = this.nonceBindings.get(executionNonce);
    if (existingBinding) {
      if (!sameBinding(existingBinding, binding)) {
        throw new Error(`Replay de execution nonce detectado: ${executionNonce}`);
      }
      return manifest;
    }

    const used = this.executions.get(manifest.id) ?? 0;
    if (used >= manifest.maxExecutions) {
      throw new Error(`Budget do Execution Manifest excedido (${manifest.maxExecutions}): ${manifest.id}`);
    }
    this.nonceBindings.set(executionNonce, Object.freeze(binding));
    this.executions.set(manifest.id, used + 1);
    return manifest;
  }

  executionsUsed(manifestId: string): number {
    this.get(manifestId);
    return this.executions.get(manifestId) ?? 0;
  }

  hasConsumedNonce(executionNonce: string): boolean {
    return this.nonceBindings.has(executionNonce.trim());
  }
}
