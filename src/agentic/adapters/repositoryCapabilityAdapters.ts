import type { CapabilityAdapter } from '@/agentic/runtime/capabilityAdapterRegistry';

export interface RepositoryReadInput {
  path: string;
  ref?: string;
}

export interface RepositorySearchInput {
  query: string;
}

export interface RepositoryWriteInput {
  path: string;
  content: string;
  message: string;
  expectedSha?: string;
}

export interface RepositoryTransport {
  read(input: RepositoryReadInput): Promise<unknown>;
  search(input: RepositorySearchInput): Promise<unknown>;
  write(input: RepositoryWriteInput): Promise<unknown>;
}

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} obrigatório.`);
  return normalized;
};

const pathResource = (path: string): string => `repo:path:${required(path, 'path')}`;

const assertResource = (actual: string, expected: string): void => {
  if (actual !== expected) throw new Error(`Resource do adapter divergente: esperado ${expected}.`);
};

export const createRepositoryCapabilityAdapters = (transport: RepositoryTransport): CapabilityAdapter[] => [
  {
    capability: 'repo.read',
    allowedRisks: ['read'],
    validateResource(input: unknown, resource: string) {
      const value = input as RepositoryReadInput;
      assertResource(resource, pathResource(value.path));
    },
    execute(input: unknown) {
      const value = input as RepositoryReadInput;
      return transport.read({ ...value, path: required(value.path, 'path') });
    },
  },
  {
    capability: 'repo.search',
    allowedRisks: ['read'],
    validateResource(_input: unknown, resource: string) {
      assertResource(resource, 'repo:search');
    },
    execute(input: unknown) {
      const value = input as RepositorySearchInput;
      return transport.search({ query: required(value.query, 'query') });
    },
  },
  {
    capability: 'repo.write',
    allowedRisks: ['write'],
    validateResource(input: unknown, resource: string) {
      const value = input as RepositoryWriteInput;
      assertResource(resource, pathResource(value.path));
    },
    execute(input: unknown) {
      const value = input as RepositoryWriteInput;
      return transport.write({
        ...value,
        path: required(value.path, 'path'),
        content: value.content ?? '',
        message: required(value.message, 'message'),
      });
    },
  },
];
