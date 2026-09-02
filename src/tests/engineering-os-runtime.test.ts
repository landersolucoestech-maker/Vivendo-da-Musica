import { describe, expect, it } from 'vitest';
import {
  addEvidence,
  authorize,
  createRun,
  evaluateCompletion,
  loadWorkflow,
  setGate,
  transitionRun,
} from '../../scripts/engineering-os/runtime.mjs';

describe('Engineering OS runtime', () => {
  it('defaults to deny for scopes not granted to an agent', () => {
    expect(authorize({ agentId: 'repo-archaeologist', scope: 'source-write', operation: 'edit' })).toEqual({
      allowed: false,
      reason: 'scope-not-allowed:source-write',
    });
  });

  it('denies production writes even to critical release roles without an allowed scope', () => {
    expect(authorize({ agentId: 'release-engineer', scope: 'production-write', operation: 'production-deploy', approvals: ['production-deploy'] }).allowed).toBe(false);
  });

  it('forbids a gate from passing without evidence', () => {
    const run = createRun({ workflowId: 'brownfield', risk: 'high' });
    expect(() => setGate(run, 'inventory-evidence', { status: 'passed' })).toThrow(/cannot pass without evidence/);
  });

  it('rejects claim-only manual verification', () => {
    const run = createRun({ workflowId: 'brownfield', risk: 'high' });
    expect(() => addEvidence(run, {
      kind: 'manual-verification',
      source: 'agent',
      result: 'claim-only',
      timestamp: new Date().toISOString(),
    })).toThrow(/Claim-only evidence is forbidden/);
  });

  it('does not report completion until every required gate has evidence from its bound producer', () => {
    const workflow = loadWorkflow('brownfield');
    let run = createRun({ workflowId: 'brownfield', risk: 'high' });
    run = transitionRun(run, 'planned', 'plan-created');
    run = transitionRun(run, 'running', 'execution-started');
    run = transitionRun(run, 'review', 'implementation-complete');

    expect(evaluateCompletion({ run, workflow }).complete).toBe(false);

    for (const gateId of workflow.requiredGates) {
      const producer = workflow.steps.find((step) => step.gates.includes(gateId));
      const evidence = {
        id: `evidence-${gateId}`,
        kind: gateId === 'independent-review' ? 'review' : 'test',
        source: `fixture:${gateId}`,
        result: 'passed',
        timestamp: new Date().toISOString(),
        producerAgentId: producer.agent,
        producerSkillId: producer.skill,
      };
      run = addEvidence(run, evidence);
      run = setGate(run, gateId, { status: 'passed', evidenceIds: [evidence.id] });
    }

    expect(evaluateCompletion({ run, workflow }).complete).toBe(true);
  });

  it('rejects a passed gate backed only by evidence from the wrong producer', () => {
    const workflow = loadWorkflow('brownfield');
    let run = createRun({ workflowId: 'brownfield', risk: 'high' });
    run = addEvidence(run, {
      id: 'borrowed-evidence',
      kind: 'test',
      source: 'fixture',
      result: 'passed',
      timestamp: new Date().toISOString(),
      producerAgentId: 'backend-engineer',
      producerSkillId: 'implementation',
    });
    run = setGate(run, 'inventory-evidence', { status: 'passed', evidenceIds: ['borrowed-evidence'] });

    expect(evaluateCompletion({ run, workflow }).failures).toContain(
      'gate-evidence-provenance-mismatch:inventory-evidence:repo-archaeologist:repository-inventory',
    );
  });
});
