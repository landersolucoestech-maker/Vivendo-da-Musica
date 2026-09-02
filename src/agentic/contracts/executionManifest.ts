import { z } from 'zod';

import { agentRiskSchema, type AgentRisk } from '@/agentic/contracts/agentContract';
import {
  evidenceKindSchema,
  type EvidenceKind,
  type EvidenceRecord,
} from '@/agentic/contracts/evidenceContract';

export const executionManifestSchema = z.object({
  id: z.string().min(1),
  correlationId: z.string().min(1),
  workflowId: z.string().min(1),
  agentId: z.string().min(1),
  capability: z.string().min(1),
  risk: agentRiskSchema,
  allowedResources: z.array(z.string().min(1)).min(1),
  maxExecutions: z.number().int().positive(),
  requiredEvidenceKinds: z.array(evidenceKindSchema).default([]),
  environment: z.enum(['development', 'staging', 'production']).nullable().default(null),
  artifactRef: z.string().min(1).nullable().default(null),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  signature: z.string().min(1).nullable().default(null),
});

type ParsedExecutionManifest = z.infer<typeof executionManifestSchema>;

export type ExecutionManifest = Readonly<
  Omit<ParsedExecutionManifest, 'allowedResources' | 'requiredEvidenceKinds'> & {
    allowedResources: readonly string[];
    requiredEvidenceKinds: readonly EvidenceKind[];
  }
>;
export type ExecutionManifestInput = z.input<typeof executionManifestSchema>;

export interface ExecutionManifestSignatureVerifier {
  verify(manifest: ExecutionManifest): boolean;
}

export interface ManifestExecutionContext {
  correlationId: string;
  workflowId: string;
  agentId: string;
  capability: string;
  risk: AgentRisk;
  resource: string;
  artifactRef?: string | null;
}

export const manifestHasRequiredEvidence = (
  manifest: ExecutionManifest,
  records: readonly EvidenceRecord[],
): boolean => manifest.requiredEvidenceKinds.every((kind) =>
  records.some((record) => record.workflowId === manifest.workflowId && record.kind === kind),
);
