export const createLeasedExecutor = ({ executor, leaseStore, owner, ttlMs = 300000 } = {}) => {
  if (!executor) throw new Error('Leased executor requires an executor');
  if (!leaseStore) throw new Error('Leased executor requires a lease store');
  if (!owner) throw new Error('Leased executor requires an owner');

  const withLease = async (resource, operation) => {
    const lease = leaseStore.acquire({ resource, owner, ttlMs });
    try {
      return await operation();
    } finally {
      leaseStore.release({ resource, owner, token: lease.token });
    }
  };

  return {
    evidenceLedger: executor.evidenceLedger,
    initialize: (...args) => executor.initialize(...args),
    executeNext: ({ runId, ...rest }) => withLease(`run:${runId}:execution`, () => executor.executeNext({ runId, ...rest })),
    finalize: ({ runId, ...rest }) => withLease(`run:${runId}:execution`, () => executor.finalize({ runId, ...rest }))
  };
};
