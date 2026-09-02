export interface ReviewAssignment {
  executorAgentId: string;
  reviewerAgentId: string;
  reviewerCapabilities: readonly string[];
  reviewerDeniedCapabilities: readonly string[];
}

export interface SeparationOfDutiesDecision {
  allowed: boolean;
  reason: string;
}

export const evaluateIndependentReview = (
  assignment: ReviewAssignment,
): SeparationOfDutiesDecision => {
  if (assignment.executorAgentId === assignment.reviewerAgentId) {
    return {
      allowed: false,
      reason: 'O agente executor não pode aprovar a própria implementação.',
    };
  }

  if (!assignment.reviewerCapabilities.includes('review.change')) {
    return {
      allowed: false,
      reason: 'O agente revisor não possui a capability review.change.',
    };
  }

  if (!assignment.reviewerDeniedCapabilities.includes('repo.write')) {
    return {
      allowed: false,
      reason: 'O revisor independente precisa ter repo.write explicitamente negada.',
    };
  }

  return {
    allowed: true,
    reason: 'Separação de funções validada para revisão independente.',
  };
};
