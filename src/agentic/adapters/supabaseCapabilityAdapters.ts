import type { CapabilityAdapter } from '@/agentic/runtime/capabilityAdapterRegistry';

export interface SupabaseInspectInput {
  resource: string;
  query?: string;
}

export interface SupabaseTransport {
  inspect(input: SupabaseInspectInput): Promise<unknown>;
}

export const createSupabaseCapabilityAdapters = (transport: SupabaseTransport): CapabilityAdapter[] => [
  {
    capability: 'database.inspect',
    allowedRisks: ['read'],
    execute(input: unknown) {
      const value = input as SupabaseInspectInput;
      const resource = value.resource?.trim();
      if (!resource) throw new Error('resource obrigatório para database.inspect.');
      return transport.inspect({ ...value, resource });
    },
  },
];
