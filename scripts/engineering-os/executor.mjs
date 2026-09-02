import {
  addEvidence,
  createRun,
  evaluateCompletion,
  fingerprint,
  loadWorkflow,
  setGate,
  transitionRun
} from './runtime.mjs';
import { selectNextStep } from './dispatcher.mjs';
import { createEvidenceLedger } from './evidence-ledger.mjs';
import { resolveAgentHandler } from './agent-handlers.mjs';

const nowIso = () => new Date().toISOString();

const setStep = (run, stepId, patch) => ({
  ...run,
  steps: {
    ...run.steps,
    [stepId]: {
      ...(run.steps[stepId] ?? {}),
      ...patch,
      updatedAt: nowIso()
    }
  },
  updatedAt: nowIso()
});

export const createWorkflowExecutor = ({ stateStore, broker, handlers = {}, audit = broker?.audit ?? null, evidenceLedger = null } = {}) => {
  if (!stateStore) throw new Error('Workflow executor requires a state store');
  if (!broker) throw new Error('Workflow executor requires a tool broker');
  const evidenceStore = evidenceLedger ?? createEvidenceLedger({ audit });
  const persist = (run, expectedFingerprint = null) => stateStore.write(run, expectedFingerprint);

  return {
    evidenceLedger: evidenceStore,

    initialize({ workflowId, metadata = {} }) {
      const workflow = loadWorkflow(workflowId);
      let run = createRun({ workflowId, risk: workflow.risk ?? 'medium', metadata });
      run = transitionRun(run, 'planned', 'workflow-initialized');
      persist(run);
      audit?.append({ type: 'run.initialized', actor: 'orchestrator', runId: run.id, payload: { workflowId, risk: run.risk } });
      return structuredClone(run);
    },

    async executeNext({ runId }) {
      let run = stateStore.read(runId);
      if (!run) throw new Error(`Run not found: ${runId}`);
      const beforeFingerprint = fingerprint(run);
      if (['completed', 'failed', 'cancelled'].includes(run.status)) throw new Error(`Run is terminal: ${run.status}`);
      if (run.status === 'created') throw new Error('Run must be planned before execution');
      if (['planned', 'blocked'].includes(run.status)) run = transitionRun(run, 'running', 'executor-dispatch');

      const dispatch = selectNextStep({ run, workflowId: run.workflowId, approvalLedger: broker.approvals });
      if (dispatch.type === 'none') {
        if (run.status === 'running') run = transitionRun(run, 'review', 'workflow-steps-exhausted');
        persist(run, beforeFingerprint);
        return { type: 'review', run: structuredClone(run) };
      }
      if (dispatch.type === 'blocked') {
        if (run.status === 'running') run = transitionRun(run, 'blocked', dispatch.reason);
        run = setStep(run, dispatch.step.stepId, { required: dispatch.step.required, status: 'blocked', reason: dispatch.reason });
        persist(run, beforeFingerprint);
        audit?.append({ type: 'step.blocked', actor: dispatch.step.agentId, runId, payload: { stepId: dispatch.step.stepId, reason: dispatch.reason } });
        return { type: 'blocked', step: dispatch.step, run: structuredClone(run) };
      }

      const { step } = dispatch;
      const handler = resolveAgentHandler(handlers, step);
      if (typeof handler !== 'function') throw new Error(`No handler registered for agent skill: ${step.agentId}/${step.skillId}`);

      run = setStep(run, step.stepId, {
        required: step.required,
        status: 'running',
        agentId: step.agentId,
        skillId: step.skillId,
        startedAt: nowIso(),
        reason: null
      });
      const runningFingerprint = persist(run, beforeFingerprint);
      audit?.append({ type: 'step.started', actor: step.agentId, runId, payload: { stepId: step.stepId, skillId: step.skillId } });

      const callTool = (request) => broker.execute({ ...request, runId, agentId: step.agentId });
      try {
        if (step.authorization.approvalId) {
          broker.approvals.consume({
            approvalId: step.authorization.approvalId,
            runId,
            scope: step.scope,
            operation: step.operation,
            toolId: null,
            actor: step.agentId
          });
        }

        const result = await handler({ run: structuredClone(run), step: structuredClone(step), callTool });
        const evidenceIds = [];
        const ledgerRecordIds = [];
        for (const evidence of result?.evidence ?? []) {
          const ledgerRecord = evidenceStore.append({ runId, agentId: step.agentId, evidence });
          ledgerRecordIds.push(ledgerRecord.id);
          run = addEvidence(run, { ...evidence, ledgerRecordId: ledgerRecord.id });
          evidenceIds.push(run.evidence.at(-1).id);
        }

        for (const gateId of step.gates) {
          const gateResult = result?.gates?.[gateId];
          if (!gateResult) throw new Error(`Agent did not return gate decision: ${gateId}`);
          const selectedEvidenceIds = gateResult.evidenceIds ?? evidenceIds;
          run = setGate(run, gateId, {
            status: gateResult.status,
            evidenceIds: selectedEvidenceIds,
            reason: gateResult.reason ?? null
          });
        }

        run = setStep(run, step.stepId, {
          status: 'completed',
          completedAt: nowIso(),
          outputFingerprint: fingerprint(result?.output ?? null),
          evidenceIds,
          ledgerRecordIds
        });
        persist(run, runningFingerprint);
        audit?.append({ type: 'step.completed', actor: step.agentId, runId, payload: { stepId: step.stepId, skillId: step.skillId, evidenceIds, ledgerRecordIds } });
        return { type: 'completed-step', step, result: structuredClone(result ?? {}), run: structuredClone(run) };
      } catch (error) {
        const latest = stateStore.read(runId) ?? run;
        const latestFingerprint = fingerprint(latest);
        let failed = setStep(latest, step.stepId, { status: 'failed', failedAt: nowIso(), reason: String(error?.message ?? error) });
        failed = transitionRun(failed, 'failed', `step-failed:${step.stepId}`);
        persist(failed, latestFingerprint);
        audit?.append({ type: 'step.failed', actor: step.agentId, runId, payload: { stepId: step.stepId, skillId: step.skillId, error: String(error?.message ?? error) } });
        throw error;
      }
    },

    finalize({ runId }) {
      let run = stateStore.read(runId);
      if (!run) throw new Error(`Run not found: ${runId}`);
      const workflow = loadWorkflow(run.workflowId);
      const evaluation = evaluateCompletion({ run, workflow });
      if (!evaluation.complete) return { finalized: false, evaluation, run: structuredClone(run) };
      if (run.status !== 'review') throw new Error(`Run must be in review before completion: ${run.status}`);
      const previousFingerprint = fingerprint(run);
      run = transitionRun(run, 'completed', 'completion-gate-passed');
      persist(run, previousFingerprint);
      audit?.append({ type: 'run.completed', actor: 'orchestrator', runId, payload: { evaluationFingerprint: evaluation.fingerprint, evidenceLedgerDigest: evidenceStore.digest() } });
      return { finalized: true, evaluation, run: structuredClone(run) };
    }
  };
};
