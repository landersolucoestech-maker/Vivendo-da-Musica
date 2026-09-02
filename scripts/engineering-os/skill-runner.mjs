import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAgent, fingerprint } from './runtime.mjs';
import { getTool } from './tool-broker.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const skillRegistry = JSON.parse(fs.readFileSync(path.join(root, 'engineering-os/registry/skills.json'), 'utf8'));
const riskRank = { low: 1, medium: 2, high: 3, critical: 4 };

export const getSkill = (skillId) => {
  const skill = skillRegistry.skills.find((candidate) => candidate.id === skillId);
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);
  return skill;
};

export const runSkill = async ({ runId, agentId, skillId, broker, handler, input = {} }) => {
  if (!runId || !agentId || !skillId || !broker || typeof handler !== 'function') throw new Error('Skill execution missing required fields');
  const agent = getAgent(agentId);
  const skill = getSkill(skillId);
  if (!(agent.skills ?? []).includes(skillId)) throw new Error(`Skill not assigned to agent: ${agentId}/${skillId}`);
  if ((riskRank[agent.risk] ?? Infinity) > (riskRank[skill.maxRisk] ?? 0)) {
    throw new Error(`Agent risk exceeds skill ceiling: ${agentId}/${skillId}`);
  }

  const calls = [];
  const callTool = async (request) => {
    if (!(skill.allowedTools ?? []).includes(request.toolId)) throw new Error(`Tool not allowed by skill: ${skillId}/${request.toolId}`);
    const tool = getTool(request.toolId);
    if ((riskRank[tool.risk] ?? Infinity) > (riskRank[skill.maxRisk] ?? 0)) {
      throw new Error(`Tool risk exceeds skill ceiling: ${skillId}/${request.toolId}`);
    }
    const response = await broker.execute({ ...request, runId, agentId });
    calls.push({ toolId: request.toolId, callFingerprint: response.callFingerprint, resultFingerprint: fingerprint(response.result) });
    return response;
  };

  broker.audit?.append({ type: 'skill.started', actor: agentId, runId, payload: { skillId, inputFingerprint: fingerprint(input) } });
  try {
    const result = await handler({ input: structuredClone(input), callTool, agent: structuredClone(agent), skill: structuredClone(skill) });
    const evidence = result?.evidence ?? [];
    for (const kind of skill.requiredEvidenceKinds ?? []) {
      if (!evidence.some((item) => item.kind === kind)) throw new Error(`Skill missing required evidence kind: ${skillId}/${kind}`);
    }
    const response = {
      skillId,
      agentId,
      output: result?.output ?? null,
      evidence,
      calls,
      fingerprint: fingerprint({ skillId, agentId, output: result?.output ?? null, evidence, calls })
    };
    broker.audit?.append({ type: 'skill.completed', actor: agentId, runId, payload: { skillId, resultFingerprint: response.fingerprint } });
    return response;
  } catch (error) {
    broker.audit?.append({ type: 'skill.failed', actor: agentId, runId, payload: { skillId, error: String(error?.message ?? error) } });
    throw error;
  }
};
