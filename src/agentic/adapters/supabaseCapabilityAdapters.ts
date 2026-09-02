import type { CapabilityAdapter } from '@/agentic/runtime/capabilityAdapterRegistry';

export interface SupabaseInspectInput {
  resource: string;
  query?: string;
}

export interface SupabaseTransport {
  inspect(input: SupabaseInspectInput): Promise<unknown>;
}

const normalizeResource = (value: string): string => {
  const resource = value?.trim();
  if (!resource) throw new Error('resource obrigatório para database.inspect.');
  return resource;
};

export const createSupabaseCapabilityAdapters = (transport: SupabaseTransport): CapabilityAdapter[] => [
  {
    capability: 'database.inspect',
    allowedRisks: ['read'],
    validateResource(input: unknown, declaredResource: string) {
      const value = input as SupabaseInspectInput;
      const expected = `supabase:${normalizeResource(value.resource)}`;
      if (declaredResource !== expected) {
        throw new Error(`Resource do adapter divergente: esperado ${expected}.`);
      }
    },
    execute(input: unknown) {
      const value = input as SupabaseInspectInput;
      const resource = normalizeResource(value.resource);
      return transport.inspect({ ...value, resource });
    },
  },
];
