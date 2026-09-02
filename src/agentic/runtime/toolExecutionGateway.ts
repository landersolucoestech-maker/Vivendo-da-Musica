import type { AgentRisk } from '@/agentic/contracts/agentContract';
import { EvidenceStore } from '@/agentic/evidence/evidenceStore';
import { ApprovalReceiptStore } from '@/agentic/runtime/approvalReceiptStore';
import { CapabilityAdapterRegistry, type CapabilityExecutionContext } from '@/agentic/runtime/capabilityAdapterRegistry';
import { CircuitBreaker } from '@/agentic/runtime/circuitBreaker';
import { IdempotencyStore } from '@/agentic/runtime/idempotencyStore';
import { LeaseManager } from '@/agentic/runtime/leaseManager';
import { ResilientExecutor, type RetryPolicy } from '@/agentic/runtime/resilientExecutor';

export interface ToolExecutionRequest<Input = unknown> extends CapabilityExecutionContext {
  input: Input;
  approvalReceiptId?: string;
  leaseResource?: string;
  retry?: Partial<RetryPolicy>;
}

export class ToolExecutionGateway {
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(
    private readonly adapters: CapabilityAdapterRegistry,
    private readonly idempotency: IdempotencyStore,
    private readonly approvals: ApprovalReceiptStore,
    private readonly leases: LeaseManager,
    private readonly evidence: EvidenceStore,
  ) {}

  async execute<Input, Output>(request: ToolExecutionRequest<Input>): Promise<Output> {
    const adapter = this.adapters.get(request.capability, request.risk) as {
      validateResource?(input: Input, resource: string): void;
      execute(input: Input, context: CapabilityExecutionContext): Promise<Output>;
    };
    adapter.validateResource?.(request.input, request.resource);

    const existing = this.idempotency.get(request.idempotencyKey);
    if (existing?.state === 'completed') {
      this.appendEvidence(request, 'tool_result', {
        capability: request.capability,
        risk: request.risk,
        idempotencyKey: request.idempotencyKey,
        manifestId: request.manifestId,
        resource: request.resource,
        cached: true,
        success: true,
      });
      return existing.result as Output;
    }
    if (existing) throw new Error(`Idempotency key indisponível para nova execução: ${request.idempotencyKey}`);

    if (requiresApproval(request.risk)) {
      if (!request.approvalReceiptId) throw new Error(`Approval receipt obrigatório para risco ${request.risk}.`);
      this.approvals.assertValid(request.approvalReceiptId, request);
    }

    if (requiresLease(request.risk)) {
      if (!request.leaseResource) throw new Error(`Lease obrigatória para risco ${request.risk}.`);
      this.leases.assertHeld(request.leaseResource, request.agentId);
    }

    this.appendEvidence(request, 'tool_call', {
      capability: request.capability,
      risk: request.risk,
      idempotencyKey: request.idempotencyKey,
      manifestId: request.manifestId,
      resource: request.resource,
      leaseResource: request.leaseResource ?? null,
      approvalReceiptId: request.approvalReceiptId ?? null,
    });

    this.idempotency.start(request.idempotencyKey);
    const breaker = this.breakers.get(request.capability) ?? new CircuitBreaker();
    this.breakers.set(request.capability, breaker);
    const executor = new ResilientExecutor(breaker);

    try {
      const result = await executor.execute(
        () => adapter.execute(request.input, request),
        {
          maxAttempts: request.retry?.maxAttempts ?? 2,
          timeoutMs: request.retry?.timeoutMs ?? 15_000,
        },
      );
      this.idempotency.complete(request.idempotencyKey, result);
      this.appendEvidence(request, 'tool_result', {
        capability: request.capability,
        risk: request.risk,
        idempotencyKey: request.idempotencyKey,
        manifestId: request.manifestId,
        resource: request.resource,
        cached: false,
        success: true,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida.';
      this.idempotency.fail(request.idempotencyKey, message);
      this.appendEvidence(request, 'error', {
        capability: request.capability,
        risk: request.risk,
        idempotencyKey: request.idempotencyKey,
        manifestId: request.manifestId,
        resource: request.resource,
        message,
      });
      throw error;
    }
  }

  private appendEvidence(
    request: ToolExecutionRequest<unknown>,
    kind: 'tool_call' | 'tool_result' | 'error',
    payload: Record<string, unknown>,
  ): void {
    this.evidence.append({
      id: `${request.correlationId}:${kind}:${this.evidence.all().length}`,
      correlationId: request.correlationId,
      workflowId: request.workflowId,
      agentId: request.agentId,
      kind,
      occurredAt: new Date().toISOString(),
      payload,
    });
  }
}

const requiresApproval = (risk: AgentRisk): boolean => risk === 'privileged' || risk === 'destructive';
const requiresLease = (risk: AgentRisk): boolean => risk === 'write' || risk === 'privileged' || risk === 'destructive';
