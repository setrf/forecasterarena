import type { AgentDecisionResult } from '@/lib/engine/decision/types';
import type { AgentWithModel } from '@/lib/types';

export function createDecisionResult(agent: AgentWithModel): AgentDecisionResult {
  return {
    agent_id: agent.id,
    model_id: agent.model_id,
    decision_id: '',
    action: 'ERROR',
    success: false
  };
}
