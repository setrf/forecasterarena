import { getDb } from '@/lib/db/connection';
import { generateId } from '@/lib/db/ids';
import {
  DECISION_IN_PROGRESS_ERROR,
  DECISION_PLACEHOLDER_PROMPT
} from '@/lib/db/queries/decisions/constants';
import {
  getDecisionByAgentWeek,
  getDecisionById
} from '@/lib/db/queries/decisions/getters';
import { getDecisionLineageSnapshot } from '@/lib/db/queries/decisions/lineage';
import type {
  ClaimDecisionArgs,
  DecisionClaimResult
} from '@/lib/db/queries/decisions/types';
import { withImmediateTransaction } from '@/lib/db/transactions';

export function claimDecisionForProcessing(args: ClaimDecisionArgs): DecisionClaimResult {
  return withImmediateTransaction(() => {
    const db = getDb();
    const agent = db.prepare('SELECT cohort_id FROM agents WHERE id = ?')
      .get(args.agent_id) as { cohort_id: string } | undefined;
    if (!agent || agent.cohort_id !== args.cohort_id) {
      throw new Error('Decision agent/cohort mismatch');
    }

    const now = new Date().toISOString();
    const existing = getDecisionByAgentWeek(args.agent_id, args.cohort_id, args.decision_week);

    if (existing) {
      const tradesCount = (db.prepare(`
        SELECT COUNT(*) as count
        FROM trades
        WHERE decision_id = ?
      `).get(existing.id) as { count: number }).count;
      const retryableNoTrades = (
        existing.action === 'BET' || existing.action === 'SELL'
      ) && tradesCount === 0;
      const inProgress = existing.action === 'ERROR' && existing.error_message === DECISION_IN_PROGRESS_ERROR;
      const isStale = inProgress &&
        (Date.now() - new Date(existing.decision_timestamp).getTime()) > args.stale_after_ms;

      if (!inProgress && existing.action !== 'ERROR' && !retryableNoTrades) {
        return { status: 'skipped', decision: existing };
      }

      if (inProgress && !isStale) {
        return { status: 'skipped', decision: existing };
      }

      db.prepare(`
        UPDATE decisions
        SET decision_timestamp = ?,
            prompt_system = ?,
            prompt_user = ?,
            raw_response = NULL,
            parsed_response = NULL,
            action = 'ERROR',
            reasoning = ?,
            tokens_input = NULL,
            tokens_output = NULL,
            api_cost_usd = NULL,
            response_time_ms = NULL,
            error_message = ?
        WHERE id = ?
      `).run(
        now,
        DECISION_PLACEHOLDER_PROMPT,
        DECISION_PLACEHOLDER_PROMPT,
        retryableNoTrades
          ? 'Retrying decision because no trades were recorded'
          : existing.reasoning,
        DECISION_IN_PROGRESS_ERROR,
        existing.id
      );

      return {
        status: 'claimed',
        decision: getDecisionById(existing.id)!,
        retryReason: retryableNoTrades
          ? 'Retrying decision because no trades were recorded'
          : (inProgress ? 'Retrying stale in-progress decision' : undefined)
      };
    }

    const id = generateId();
    const lineage = getDecisionLineageSnapshot(args.agent_id);
    db.prepare(`
      INSERT INTO decisions (
        id, agent_id, cohort_id, family_id, release_id, benchmark_config_model_id, decision_week, decision_timestamp,
        prompt_system, prompt_user, raw_response, parsed_response, retry_count,
        action, reasoning, tokens_input, tokens_output, api_cost_usd,
        response_time_ms, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, 'ERROR', NULL, NULL, NULL, NULL, NULL, ?)
    `).run(
      id,
      args.agent_id,
      args.cohort_id,
      lineage.family_id,
      lineage.release_id,
      lineage.benchmark_config_model_id,
      args.decision_week,
      now,
      DECISION_PLACEHOLDER_PROMPT,
      DECISION_PLACEHOLDER_PROMPT,
      DECISION_IN_PROGRESS_ERROR
    );

    return {
      status: 'claimed',
      decision: getDecisionById(id)!
    };
  });
}
