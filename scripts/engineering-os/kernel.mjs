import path from 'node:path';
import { createAgentHandlerRegistry } from './agent-handlers.mjs';
import { builtInStrategies } from './builtin-strategies.mjs';
import { createCheckpointStore } from './checkpoint-store.mjs';
import { createExecutionAdapters } from './execution-adapters.mjs';
import { createLeaseStore } from './lease-store.mjs';
import { createLeasedExecutor } from './leased-executor.mjs';
import { createRecoveryManager } from './recovery-manager.mjs';
import { RunStateStore } from './state-store.mjs';
import { createToolBroker } from './tool-broker.mjs';
import { createWorkflowExecutor } from './executor.mjs';

export const createEngineeringKernel = ({
  workspaceRoot,
  runtimeDirectory,
  workerId = `worker:${process.pid}`,
  strategies = builtInStrategies,
  adapterOverrides = {},
  brokerOptions = {}
} = {}) => {
  if (!workspaceRoot) throw new Error('Engineering kernel requires workspaceRoot');
  if (!runtimeDirectory) throw new Error('Engineering kernel requires runtimeDirectory');

  const runtimeRoot = path.resolve(runtimeDirectory);
  const adapters = {
    ...createExecutionAdapters({ workspaceRoot }),
    ...adapterOverrides
  };
  const broker = createToolBroker({ adapters, ...brokerOptions });
  const handlerRegistry = createAgentHandlerRegistry({ broker, strategies });
  const stateStore = new RunStateStore(path.join(runtimeRoot, 'state'));
  const checkpointStore = createCheckpointStore({ directory: path.join(runtimeRoot, 'checkpoints') });
  const leaseStore = createLeaseStore({ directory: path.join(runtimeRoot, 'leases') });
  const executor = createWorkflowExecutor({
    stateStore,
    broker,
    handlers: handlerRegistry.toObject()
  });
  const leasedExecutor = createLeasedExecutor({ executor, leaseStore, owner: workerId });
  const recovery = createRecoveryManager({
    stateStore,
    checkpointStore,
    leaseStore,
    audit: broker.audit
  });

  return {
    workerId,
    workspaceRoot: path.resolve(workspaceRoot),
    runtimeRoot,
    adapters,
    broker,
    approvals: broker.approvals,
    audit: broker.audit,
    handlers: handlerRegistry,
    stateStore,
    checkpointStore,
    leaseStore,
    executor: leasedExecutor,
    recovery,
    initialize: (options) => leasedExecutor.initialize(options),
    executeNext: (options) => leasedExecutor.executeNext(options),
    finalize: (options) => leasedExecutor.finalize(options)
  };
};
