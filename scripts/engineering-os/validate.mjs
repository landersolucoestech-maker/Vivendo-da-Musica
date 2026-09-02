import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry, runtimePolicy, loadWorkflow } from './runtime.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const errors = [];
const validRisks = new Set(['low', 'medium', 'high', 'critical']);
const riskRank = { low: 1, medium: 2, high: 3, critical: 4 };
const ids = new Set();
const agentsById = new Map();
for (const agent of registry.agents) {
  if (!agent.id || !agent.name || !agent.risk) errors.push(`agent-invalid:${agent.id ?? 'unknown'}`);
  if (!validRisks.has(agent.risk)) errors.push(`agent-risk-invalid:${agent.id}:${agent.risk}`);
  if (ids.has(agent.id)) errors.push(`agent-duplicate:${agent.id}`);
  ids.add(agent.id);
  agentsById.set(agent.id, agent);
  for (const scope of agent.allowedScopes ?? []) {
    if ((agent.deniedScopes ?? []).includes(scope)) errors.push(`agent-scope-conflict:${agent.id}:${scope}`);
  }
}

if (!runtimePolicy.defaultDeny) errors.push('policy-default-deny-required');
if (!runtimePolicy.completion?.requireEvidenceForEachGate) errors.push('policy-evidence-per-gate-required');
if (!runtimePolicy.completion?.forbidClaimOnlyEvidence) errors.push('policy-claim-only-must-be-forbidden');

const tools = readJson('engineering-os/registry/tools.json');
const toolIds = new Set();
const toolsById = new Map();
const validApprovals = new Set(['never', 'policy', 'required']);
for (const tool of tools.tools ?? []) {
  if (!tool.id || !tool.scope || !tool.capability) errors.push(`tool-invalid:${tool.id ?? 'unknown'}`);
  if (toolIds.has(tool.id)) errors.push(`tool-duplicate:${tool.id}`);
  toolIds.add(tool.id);
  toolsById.set(tool.id, tool);
  if (!validRisks.has(tool.risk)) errors.push(`tool-risk-invalid:${tool.id}:${tool.risk}`);
  if (!validApprovals.has(tool.approval)) errors.push(`tool-approval-invalid:${tool.id}:${tool.approval}`);
  if (!Number.isSafeInteger(tool.timeoutMs) || tool.timeoutMs <= 0) errors.push(`tool-timeout-invalid:${tool.id}`);
  if (tool.sideEffect === 'production' && (tool.risk !== 'critical' || tool.approval !== 'required')) {
    errors.push(`tool-production-not-critical-approved:${tool.id}`);
  }
  if (tool.lock && tool.sideEffect === 'none') errors.push(`tool-unnecessary-lock:${tool.id}`);
}

const skills = readJson('engineering-os/registry/skills.json');
const skillIds = new Set();
for (const skill of skills.skills ?? []) {
  if (!skill.id || !validRisks.has(skill.maxRisk)) errors.push(`skill-invalid:${skill.id ?? 'unknown'}`);
  if (skillIds.has(skill.id)) errors.push(`skill-duplicate:${skill.id}`);
  skillIds.add(skill.id);
  for (const toolId of skill.allowedTools ?? []) {
    if (!toolIds.has(toolId)) errors.push(`skill-tool-unknown:${skill.id}:${toolId}`);
    const tool = toolsById.get(toolId);
    if (tool && riskRank[tool.risk] > riskRank[skill.maxRisk]) errors.push(`skill-tool-risk-exceeds:${skill.id}:${toolId}`);
  }
  for (const kind of skill.requiredEvidenceKinds ?? []) {
    if (!runtimePolicy.evidence.allowedKinds.includes(kind)) errors.push(`skill-evidence-kind-unknown:${skill.id}:${kind}`);
  }
}
for (const agent of registry.agents) {
  for (const skillId of agent.skills ?? []) {
    if (!skillIds.has(skillId)) errors.push(`agent-skill-unknown:${agent.id}:${skillId}`);
  }
}

const requiredContracts = [
  'engineering-os/contracts/run-state.schema.json',
  'engineering-os/contracts/tool-call.schema.json',
  'engineering-os/contracts/approval.schema.json'
];
for (const contract of requiredContracts) {
  if (!fs.existsSync(path.join(root, contract))) errors.push(`contract-missing:${contract}`);
  else {
    const schema = readJson(contract);
    if (schema.type !== 'object' || !schema.$schema) errors.push(`contract-invalid:${contract}`);
  }
}

const workflowDir = path.join(root, 'engineering-os/workflows');
for (const file of fs.readdirSync(workflowDir).filter((name) => name.endsWith('.json'))) {
  const workflowId = file.replace(/\.json$/, '');
  const workflow = loadWorkflow(workflowId);
  const stepIds = new Set();
  for (const step of workflow.steps ?? []) {
    if (stepIds.has(step.id)) errors.push(`workflow-step-duplicate:${workflowId}:${step.id}`);
    stepIds.add(step.id);
    const agent = agentsById.get(step.agent);
    if (!agent) errors.push(`workflow-agent-unknown:${workflowId}:${step.id}:${step.agent}`);
    if (!step.skill || !skillIds.has(step.skill)) errors.push(`workflow-skill-unknown:${workflowId}:${step.id}:${step.skill ?? 'missing'}`);
    if (agent && step.skill && !(agent.skills ?? []).includes(step.skill)) errors.push(`workflow-skill-not-assigned:${workflowId}:${step.id}:${step.agent}:${step.skill}`);
    const scope = step.scope ?? 'read';
    if (agent && !(agent.allowedScopes ?? []).includes(scope)) errors.push(`workflow-scope-not-allowed:${workflowId}:${step.id}:${step.agent}:${scope}`);
    for (const gate of step.gates ?? []) {
      if (!(workflow.requiredGates ?? []).includes(gate)) errors.push(`workflow-gate-not-required:${workflowId}:${gate}`);
    }
  }
  for (const gate of workflow.requiredGates ?? []) {
    const producers = (workflow.steps ?? []).filter((step) => (step.gates ?? []).includes(gate));
    if (producers.length !== 1) errors.push(`workflow-gate-producer-count:${workflowId}:${gate}:${producers.length}`);
  }
}

if (errors.length) {
  console.error(`Engineering OS validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Engineering OS valid: ${registry.agents.length} agents, ${skillIds.size} skills, ${toolIds.size} governed tools, ${requiredContracts.length} required contracts, default-deny policy enabled.`);
