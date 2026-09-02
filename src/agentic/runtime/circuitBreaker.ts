export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly failureThreshold = 3,
    private readonly resetAfterMs = 30_000,
  ) {
    if (failureThreshold < 1) throw new Error('failureThreshold precisa ser >= 1.');
    if (resetAfterMs < 1) throw new Error('resetAfterMs precisa ser >= 1.');
  }

  state(now = Date.now()): CircuitState {
    if (this.openedAt === null) return 'closed';
    return now - this.openedAt >= this.resetAfterMs ? 'half-open' : 'open';
  }

  assertCanExecute(now = Date.now()): void {
    if (this.state(now) === 'open') throw new Error('Circuit breaker aberto.');
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  recordFailure(now = Date.now()): void {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) this.openedAt = now;
  }
}
