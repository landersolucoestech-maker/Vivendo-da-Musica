import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry, runtimePolicy, loadWorkflow } from './runtime.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const errors = [];
const ids = new Set();
for (const agent of registry.agents) {
  if (!agent.id || !agent.name || !agent.risk) errors.push(`agent-invalid:${agent.id ?? 'unknown'}`);
  if (ids.has(agent.id)) errors.push(`agent-duplicate:${agent.id}`);
  ids.add(agent.id);
  for (const scope of agent.allowedScopes ?? []) {
    if ((agent.deniedScopes ?? []).includes(scope)) errors.push(`agent-scope-conflict:${agent.id}:${scope}`);
  }
}

if (!runtimePolicy.defaultDeny) errors.push('policy-default-deny-required');
if (!runtimePolicy.completion?.requireEvidenceForEachGate) errors.push('policy-evidence-per-gate-required');
if (!runtimePolicy.completion?.forbidClaimOnlyEvidence) errors.push('policy-claim-only-must-be-forbidden');

const tools = readJson('engineering-os/registry/tools.json');
const toolIds = new Set();
const validRisks = new Set(['low', 'medium', 'high', 'critical']);
const validApprovals = new Set(['never', 'policy', 'required']);
for (const tool of tools.tools ?? []) {
  if (!tool.id || !tool.scope || !tool.capability) errors.push(`tool-invalid:${tool.id ?? 'unknown'}`);
  if (toolIds.has(tool.id)) errors.push(`tool-duplicate:${tool.id}`);
  toolIds.add(tool.id);
  if (!validRisks.has(tool.risk)) errors.push(`tool-risk-invalid:${tool.id}:${tool.risk}`);
  if (!validApprovals.has(tool.approval)) errors.push(`tool-approval-invalid:${tool.id}:${tool.approval}`);
  if (!Number.isSafeInteger(tool.timeoutMs) || tool.timeoutMs <= 0) errors.push(`tool-timeout-invalid:${tool.id}`);
  if (tool.sideEffect === 'production' && (tool.risk !== 'critical' || tool.approval !== 'required')) {
    errors.push(`tool-production-not-critical-approved:${tool.id}`);
  }
  if (tool.lock && tool.sideEffect === 'none') errors.push(`tool-unnecessary-lock:${tool.id}`);
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
    if (!ids.has(step.agent)) errors.push(`workflow-agent-unknown:${workflowId}:${step.id}:${step.agent}`);
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

console.log(`Engineering OS valid: ${registry.agents.length} agents, ${toolIds.size} governed tools, ${requiredContracts.length} required contracts, default-deny policy enabled.`);
