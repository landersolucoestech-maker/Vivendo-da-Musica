import { CircuitBreaker } from '@/agentic/runtime/circuitBreaker';

export interface RetryPolicy {
  maxAttempts: number;
  timeoutMs: number;
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Execução excedeu timeout de ${timeoutMs}ms.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export class ResilientExecutor {
  constructor(private readonly breaker: CircuitBreaker) {}

  async execute<T>(operation: () => Promise<T>, policy: RetryPolicy): Promise<T> {
    if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 5) {
      throw new Error('maxAttempts precisa estar entre 1 e 5.');
    }
    if (!Number.isFinite(policy.timeoutMs) || policy.timeoutMs < 1) throw new Error('timeoutMs precisa ser positivo.');

    let lastError: unknown;
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
      this.breaker.assertCanExecute();
      try {
        const result = await withTimeout(operation(), policy.timeoutMs);
        this.breaker.recordSuccess();
        return result;
      } catch (error) {
        lastError = error;
        this.breaker.recordFailure();
        if (this.breaker.state() === 'open') break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Execução falhou sem erro estruturado.');
  }
}
