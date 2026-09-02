import { z } from 'zod';
import { agentRiskSchema } from '@/agentic/contracts/agentContract';

const capabilityPrefixSchema = z
  .string()
  .min(2)
  .regex(/^[a-z0-9]+(?:[.:_-][a-z0-9]+)*\.$/);

export const skillContractSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  version: z.string().min(1),
  name: z.string().min(1),
  objective: z.string().min(1),
  enabled: z.boolean().default(true),
  capabilityPrefixes: z.array(capabilityPrefixSchema).min(1),
  allowedRisks: z.array(agentRiskSchema).min(1),
  requiredEvidence: z.array(z.string().min(1)).default([]),
});

export type SkillContract = z.infer<typeof skillContractSchema>;

export interface SkillResolution {
  allowed: boolean;
  reason: string;
  skill: SkillContract | null;
}
