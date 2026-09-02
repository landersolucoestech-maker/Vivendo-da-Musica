import { z } from 'zod';

export const evidenceKindSchema = z.enum([
  'request',
  'admission',
  'policy',
  'approval',
  'tool_call',
  'tool_result',
  'verification',
  'workflow_transition',
  'error',
]);

export const evidenceRecordSchema = z.object({
  id: z.string().min(1),
  correlationId: z.string().min(1),
  workflowId: z.string().min(1).nullable().default(null),
  agentId: z.string().min(1),
  kind: evidenceKindSchema,
  sequence: z.number().int().nonnegative(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.unknown()),
  previousHash: z.string().nullable(),
  hash: z.string().min(1),
});

export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export type EvidenceRecordInput = Omit<EvidenceRecord, 'sequence' | 'previousHash' | 'hash'>;
