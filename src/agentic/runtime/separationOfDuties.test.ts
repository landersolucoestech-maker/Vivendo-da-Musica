import { describe, expect, it } from 'vitest';

import { reviewerAgent } from '@/agentic/agents/reviewer.agent';

import { evaluateIndependentReview } from './separationOfDuties';

describe('evaluateIndependentReview', () => {
  it('rejects self-review', () => {
    const decision = evaluateIndependentReview({
      executorAgentId: 'engineering-orchestrator',
      reviewerAgentId: 'engineering-orchestrator',
      reviewerCapabilities: ['review.change'],
      reviewerDeniedCapabilities: ['repo.write'],
    });
    expect(decision.allowed).toBe(false);
  });

  it('requires reviewer write capability to be explicitly denied', () => {
    const decision = evaluateIndependentReview({
      executorAgentId: 'engineering-orchestrator',
      reviewerAgentId: 'reviewer-agent',
      reviewerCapabilities: ['review.change'],
      reviewerDeniedCapabilities: [],
    });
    expect(decision.allowed).toBe(false);
  });

  it('accepts the dedicated reviewer contract', () => {
    const decision = evaluateIndependentReview({
      executorAgentId: 'engineering-orchestrator',
      reviewerAgentId: reviewerAgent.id,
      reviewerCapabilities: reviewerAgent.capabilities,
      reviewerDeniedCapabilities: reviewerAgent.deniedCapabilities,
    });
    expect(decision.allowed).toBe(true);
  });
});
