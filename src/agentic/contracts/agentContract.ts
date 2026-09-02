import { z } from 'zod';

export const agentCapabilitySchema = z.string().min(1).regex(/^[a-z0-9]+(?:[.:_-][a-z0-9]+)*$/);

export const agentRiskSchema = z.enum(['read', 'write', 'privileged', 'destructive']);
export type AgentRisk = z.infer<typeof agentRiskSchema>;

export const agentContractSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  version: z.string().min(1),
  role: z.string().min(1),
  objective: z.string().min(1),
  enabled: z.boolean().default(true),
  capabilities: z.array(agentCapabilitySchema).min(1),
  skillIds: z.array(z.string().min(1).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/)).default([]),
  deniedCapabilities: z.array(agentCapabilitySchema).default([]),
  humanApprovalFor: z.array(agentRiskSchema).default(['privileged', 'destructive']),
  maxSteps: z.number().int().positive().max(100).default(12),
}).superRefine((agent, context) => {
  const declared = new Set(agent.capabilities);
  for (const denied of agent.deniedCapabilities) {
    if (!declared.has(denied)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deniedCapabilities'],
        message: `Capability negada não declarada: ${denied}`,
      });
    }
  }
});

export type AgentContract = z.infer<typeof agentContractSchema>;

export const agentExecutionRequestSchema = z.object({
  agentId: z.string().min(1),
  capability: agentCapabilitySchema,
  risk: agentRiskSchema,
  approvedByHuman: z.boolean().default(false),
  correlationId: z.string().min(1),
});

export type AgentExecutionRequest = z.infer<typeof agentExecutionRequestSchema>;

export interface AgentAdmissionDecision {
  allowed: boolean;
  reason: string;
  agent: AgentContract | null;
}
