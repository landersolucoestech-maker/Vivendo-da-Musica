import type { AgentRisk } from '@/agentic/contracts/agentContract';

export interface CapabilityExecutionContext {
  correlationId: string;
  workflowId: string;
  agentId: string;
  capability: string;
  risk: AgentRisk;
  idempotencyKey: string;
  manifestId: string;
  resource: string;
}

export interface CapabilityAdapterEvidence {
  kind: 'deployment_health';
  payload: Record<string, unknown>;
}

export interface CapabilityAdapter<Input = unknown, Output = unknown> {
  capability: string;
  allowedRisks: readonly AgentRisk[];
  validateResource?(input: Input, resource: string): void;
  execute(input: Input, context: CapabilityExecutionContext): Promise<Output>;
  evidence?(
    input: Input,
    output: Output,
    context: CapabilityExecutionContext,
  ): readonly CapabilityAdapterEvidence[];
}

export class CapabilityAdapterRegistry {
  private readonly adapters = new Map<string, CapabilityAdapter>();
  private sealed = false;

  register(adapter: CapabilityAdapter): void {
    if (this.sealed) throw new Error('CapabilityAdapterRegistry selado; novos adapters não podem ser registrados.');
    if (!adapter.capability.trim()) throw new Error('Adapter precisa declarar uma capability.');
    if (adapter.allowedRisks.length === 0) throw new Error(`Adapter sem riscos permitidos: ${adapter.capability}`);
    if (this.adapters.has(adapter.capability)) throw new Error(`Adapter já registrado: ${adapter.capability}`);
    this.adapters.set(adapter.capability, adapter);
  }

  seal(): void {
    this.sealed = true;
  }

  isSealed(): boolean {
    return this.sealed;
  }

  get(capability: string, risk: AgentRisk): CapabilityAdapter {
    const adapter = this.adapters.get(capability);
    if (!adapter) throw new Error(`Nenhum adapter registrado para capability: ${capability}`);
    if (!adapter.allowedRisks.includes(risk)) {
      throw new Error(`Risco ${risk} não autorizado pelo adapter ${capability}.`);
    }
    return adapter;
  }

  listCapabilities(): string[] {
    return [...this.adapters.keys()].sort();
  }
}
