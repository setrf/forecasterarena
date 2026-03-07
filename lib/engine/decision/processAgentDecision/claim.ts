import { claimDecisionForProcessing } from '@/lib/db/queries';
import { LLM_TIMEOUT_MS } from '@/lib/constants';
import type { AgentDecisionResult } from '@/lib/engine/decision/types';
import type { AgentWithModel } from '@/lib/types';

interface DecisionClaimOutcome {
  claimedDecisionId: string | null;
  skippedResult?: AgentDecisionResult;
}

export function claimAgentDecisionForProcessing(
  agent: AgentWithModel,
  cohortId: string,
  weekNumber: number,
  result: AgentDecisionResult
): DecisionClaimOutcome {
  if (agent.status === 'bankrupt') {
    return {
      claimedDecisionId: null,
      skippedResult: {
        ...result,
        action: 'SKIPPED',
        success: true
      }
    };
  }

  const decisionClaim = claimDecisionForProcessing({
    agent_id: agent.id,
    cohort_id: cohortId,
    decision_week: weekNumber,
    stale_after_ms: LLM_TIMEOUT_MS * 2
  });

  if (decisionClaim.status === 'skipped') {
    return {
      claimedDecisionId: null,
      skippedResult: {
        ...result,
        decision_id: decisionClaim.decision.id,
        action: 'SKIPPED',
        success: true
      }
    };
  }

  return {
    claimedDecisionId: decisionClaim.decision.id
  };
}
