export interface CapabilityQuotaRule {
  agentId: string | '*';
  capability: string;
  maxExecutions: number;
  windowMs: number;
}

export interface CapabilityQuotaContext {
  agentId: string;
  capability: string;
}

export interface CapabilityQuotaUsage {
  agentId: string;
  capability: string;
  maxExecutions: number;
  used: number;
  remaining: number;
  windowMs: number;
  windowStartedAt: string;
}

interface QuotaWindow {
  startedAtMs: number;
  used: number;
}

const normalizeRule = (rule: CapabilityQuotaRule): CapabilityQuotaRule => {
  const agentId = rule.agentId.trim();
  const capability = rule.capability.trim();
  if (!agentId) throw new Error('Capability quota precisa declarar agentId.');
  if (!capability) throw new Error('Capability quota precisa declarar capability.');
  if (!Number.isInteger(rule.maxExecutions) || rule.maxExecutions <= 0) {
    throw new Error(`Capability quota maxExecutions inválido: ${capability}.`);
  }
  if (!Number.isInteger(rule.windowMs) || rule.windowMs <= 0) {
    throw new Error(`Capability quota windowMs inválido: ${capability}.`);
  }
  return Object.freeze({ ...rule, agentId, capability });
};

const ruleKey = (agentId: string, capability: string): string => `${agentId}:${capability}`;

export class CapabilityQuotaStore {
  private readonly rules = new Map<string, CapabilityQuotaRule>();
  private readonly windows = new Map<string, QuotaWindow>();

  constructor(rules: readonly CapabilityQuotaRule[] = []) {
    for (const input of rules) {
      const rule = normalizeRule(input);
      const key = ruleKey(rule.agentId, rule.capability);
      if (this.rules.has(key)) throw new Error(`Capability quota duplicada: ${key}`);
      this.rules.set(key, rule);
    }
  }

  assertAndConsume(context: CapabilityQuotaContext, now = new Date()): Readonly<CapabilityQuotaUsage> | null {
    const agentId = context.agentId.trim();
    const capability = context.capability.trim();
    if (!agentId || !capability) throw new Error('Contexto de capability quota incompleto.');

    const rule = this.rules.get(ruleKey(agentId, capability))
      ?? this.rules.get(ruleKey('*', capability));
    if (!rule) return null;

    const key = ruleKey(agentId, capability);
    const nowMs = now.getTime();
    const current = this.windows.get(key);
    const active = current && nowMs - current.startedAtMs < rule.windowMs
      ? current
      : { startedAtMs: nowMs, used: 0 };

    if (active.used >= rule.maxExecutions) {
      throw new Error(
        `Quota da capability excedida para ${agentId}/${capability}: ${rule.maxExecutions} em ${rule.windowMs}ms.`,
      );
    }

    const next = { ...active, used: active.used + 1 };
    this.windows.set(key, next);
    return Object.freeze({
      agentId,
      capability,
      maxExecutions: rule.maxExecutions,
      used: next.used,
      remaining: Math.max(0, rule.maxExecutions - next.used),
      windowMs: rule.windowMs,
      windowStartedAt: new Date(next.startedAtMs).toISOString(),
    });
  }

  usage(context: CapabilityQuotaContext, now = new Date()): Readonly<CapabilityQuotaUsage> | null {
    const agentId = context.agentId.trim();
    const capability = context.capability.trim();
    const rule = this.rules.get(ruleKey(agentId, capability))
      ?? this.rules.get(ruleKey('*', capability));
    if (!rule) return null;

    const current = this.windows.get(ruleKey(agentId, capability));
    const nowMs = now.getTime();
    const active = current && nowMs - current.startedAtMs < rule.windowMs ? current : null;
    const used = active?.used ?? 0;
    return Object.freeze({
      agentId,
      capability,
      maxExecutions: rule.maxExecutions,
      used,
      remaining: Math.max(0, rule.maxExecutions - used),
      windowMs: rule.windowMs,
      windowStartedAt: new Date(active?.startedAtMs ?? nowMs).toISOString(),
    });
  }
}

export const createDefaultCapabilityQuotaStore = (): CapabilityQuotaStore => new CapabilityQuotaStore([
  { agentId: 'release-agent', capability: 'deploy.production', maxExecutions: 3, windowMs: 15 * 60_000 },
  { agentId: 'release-agent', capability: 'rollback.production', maxExecutions: 2, windowMs: 15 * 60_000 },
]);
