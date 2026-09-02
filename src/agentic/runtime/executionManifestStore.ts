import {
  executionManifestSchema,
  type ExecutionManifest,
  type ExecutionManifestInput,
  type ExecutionManifestSignatureVerifier,
  type ManifestExecutionContext,
} from '@/agentic/contracts/executionManifest';

const requiresSignature = (risk: ManifestExecutionContext['risk']): boolean =>
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
  if (!manifest.allowedResources.some((scope) => scope.startsWith('hostinger:target:') && !scope.endsWith('*'))) {
    throw new Error(`Manifesto de produção precisa fixar um target Hostinger exato: ${manifest.id}`);
  }
  const required = ['tool_call', 'tool_result', 'verification'] as const;
  const missing = required.filter((kind) => !manifest.requiredEvidenceKinds.includes(kind));
  if (missing.length > 0) {
    throw new Error(`Manifesto de produção sem evidências obrigatórias: ${missing.join(', ')}`);
  }
};

export class ExecutionManifestStore {
  private readonly manifests = new Map<string, ExecutionManifest>();
  private readonly executions = new Map<string, number>();

  constructor(private readonly signatureVerifier?: ExecutionManifestSignatureVerifier) {}

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

  assertAndConsume(manifestId: string, context: ManifestExecutionContext, now = new Date()): ExecutionManifest {
    const manifest = this.get(manifestId);
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
    if (requiresSignature(context.risk)) {
      if (!manifest.signature) throw new Error(`Execution Manifest assinado é obrigatório para risco ${context.risk}.`);
      if (!this.signatureVerifier) throw new Error('Verifier de assinatura do Execution Manifest não configurado.');
      if (!this.signatureVerifier.verify(manifest)) throw new Error('Assinatura do Execution Manifest inválida.');
    }

    const used = this.executions.get(manifest.id) ?? 0;
    if (used >= manifest.maxExecutions) {
      throw new Error(`Budget do Execution Manifest excedido (${manifest.maxExecutions}): ${manifest.id}`);
    }
    this.executions.set(manifest.id, used + 1);
    return manifest;
  }

  executionsUsed(manifestId: string): number {
    this.get(manifestId);
    return this.executions.get(manifestId) ?? 0;
  }
}
