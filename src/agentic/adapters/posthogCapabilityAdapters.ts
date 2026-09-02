import type { CapabilityAdapter } from '@/agentic/runtime/capabilityAdapterRegistry';

export interface ObservabilityInspectInput {
  scope: string;
  query?: string;
}

export interface ObservabilityVerifyInput {
  check: string;
  expected?: unknown;
}

export interface PostHogTransport {
  inspect(input: ObservabilityInspectInput): Promise<unknown>;
  verify(input: ObservabilityVerifyInput): Promise<unknown>;
}

const required = (value: string | undefined, field: string): string => {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${field} obrigatório.`);
  return normalized;
};

export const createPostHogCapabilityAdapters = (transport: PostHogTransport): CapabilityAdapter[] => [
  {
    capability: 'observability.inspect',
    allowedRisks: ['read'],
    execute(input: unknown) {
      const value = input as ObservabilityInspectInput;
      return transport.inspect({ ...value, scope: required(value.scope, 'scope') });
    },
  },
  {
    capability: 'observability.verify',
    allowedRisks: ['read'],
    execute(input: unknown) {
      const value = input as ObservabilityVerifyInput;
      return transport.verify({ ...value, check: required(value.check, 'check') });
    },
  },
];
