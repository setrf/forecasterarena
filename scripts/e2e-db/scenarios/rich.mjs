import {
  SEEDED_BENCHMARK_CONFIG_ID,
  SEEDED_COHORT_ID,
  SEEDED_EXPORT_FROM,
  SEEDED_EXPORT_TO,
  SEEDED_MARKET_CLOSE,
  SEEDED_MARKET_ID,
  SEEDED_MODELS,
  RECENT_SNAPSHOT_END,
  RECENT_SNAPSHOT_START,
  SNAPSHOT_END,
  SNAPSHOT_START
} from '../models.mjs';
import { seedScenarioMetadata } from './shared.mjs';

const modelPerformance = [
  { id: 'gpt-5.1', valueA: 10000, valueB: 10002.5, cash: 9995, invested: 5 },
  { id: 'gemini-2.5-flash', valueA: 10000, valueB: 10001, cash: 10000, invested: 0 },
  { id: 'grok-4', valueA: 10000, valueB: 9999.5, cash: 10000, invested: 0 },
  { id: 'claude-opus-4.5', valueA: 10000, valueB: 9998.75, cash: 10000, invested: 0 },
  { id: 'deepseek-v3.1', valueA: 10000, valueB: 10000.75, cash: 10000, invested: 0 },
  { id: 'kimi-k2', valueA: 10000, valueB: 10003, cash: 10000, invested: 0 },
  { id: 'qwen-3-next', valueA: 10000, valueB: 9999.25, cash: 10000, invested: 0 }
];

export function seedRichScenario(db) {
  seedScenarioMetadata(db, 'E2E seeded methodology fixture');

  db.prepare(`
    INSERT INTO cohorts (id, cohort_number, started_at, status, methodology_version, benchmark_config_id, initial_balance)
    VALUES (?, 1, ?, 'active', 'v2', ?, 10000.00)
  `).run(SEEDED_COHORT_ID, SNAPSHOT_START, SEEDED_BENCHMARK_CONFIG_ID);

  const insertAgent = db.prepare(`
    INSERT INTO agents (
      id, cohort_id, model_id, family_id, release_id, benchmark_config_model_id,
      cash_balance, total_invested, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);

  const insertSnapshot = db.prepare(`
    INSERT INTO portfolio_snapshots (
      id, agent_id, snapshot_timestamp, cash_balance, positions_value, total_value,
      total_pnl, total_pnl_percent, brier_score, num_resolved_bets
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const model of modelPerformance) {
    const agentId = `agent-${model.id}`;
    const seededModel = SEEDED_MODELS.find((candidate) => candidate.id === model.id);
    insertAgent.run(
      agentId,
      SEEDED_COHORT_ID,
      model.id,
      seededModel.familyId,
      seededModel.releaseId,
      `${SEEDED_BENCHMARK_CONFIG_ID}--${seededModel.familyId}`,
      model.cash,
      model.invested
    );
    insertSnapshot.run(
      `snapshot-a-${model.id}`,
      agentId,
      SNAPSHOT_START,
      10000,
      0,
      model.valueA,
      model.valueA - 10000,
      ((model.valueA - 10000) / 10000) * 100,
      null,
      0
    );
    insertSnapshot.run(
      `snapshot-b-${model.id}`,
      agentId,
      SNAPSHOT_END,
      model.cash,
      model.valueB - model.cash,
      model.valueB,
      model.valueB - 10000,
      ((model.valueB - 10000) / 10000) * 100,
      null,
      0
    );
    insertSnapshot.run(
      `snapshot-recent-a-${model.id}`,
      agentId,
      RECENT_SNAPSHOT_START,
      10000,
      0,
      model.valueA,
      model.valueA - 10000,
      ((model.valueA - 10000) / 10000) * 100,
      null,
      0
    );
    insertSnapshot.run(
      `snapshot-recent-b-${model.id}`,
      agentId,
      RECENT_SNAPSHOT_END,
      model.cash,
      model.valueB - model.cash,
      model.valueB,
      model.valueB - 10000,
      ((model.valueB - 10000) / 10000) * 100,
      null,
      0
    );
  }

  db.prepare(`
    INSERT INTO markets (
      id, polymarket_id, slug, event_slug, question, description, category, market_type,
      close_date, status, current_price, volume, liquidity, first_seen_at, last_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'binary', ?, 'active', ?, ?, ?, ?, ?)
  `).run(
    SEEDED_MARKET_ID,
    'polymarket-fed-e2e',
    'fed-rate-cut-e2e',
    'fed-rates-e2e',
    'Will the Fed cut rates by 50+ bps in the seeded e2e market?',
    'Seeded binary market used for browser smoke coverage.',
    'Macro',
    SEEDED_MARKET_CLOSE,
    0.55,
    250000,
    50000,
    SNAPSHOT_START,
    SNAPSHOT_END
  );

  db.prepare(`
    INSERT INTO positions (
      id, agent_id, market_id, side, shares, avg_entry_price, total_cost,
      current_value, unrealized_pnl, status, opened_at
    ) VALUES (?, ?, ?, 'YES', 10, 0.50, 5.00, 5.50, 0.50, 'open', ?)
  `).run('position-gpt-fed', 'agent-gpt-5.1', SEEDED_MARKET_ID, SNAPSHOT_END);

  const insertDecision = db.prepare(`
    INSERT INTO decisions (
      id, agent_id, cohort_id, decision_week, decision_timestamp, prompt_system, prompt_user,
      raw_response, parsed_response, retry_count, action, reasoning, tokens_input,
      tokens_output, api_cost_usd, response_time_ms, error_message, created_at
    ) VALUES (?, ?, ?, 1, ?, 'system', 'user', '{}', '{}', 0, ?, ?, ?, ?, ?, 1200, NULL, ?)
  `);

  insertDecision.run(
    'decision-gpt-fed',
    'agent-gpt-5.1',
    SEEDED_COHORT_ID,
    SNAPSHOT_END,
    'BET',
    'The seeded market is priced below my conviction, so I am buying YES shares.',
    120,
    45,
    0.42,
    SNAPSHOT_END
  );

  insertDecision.run(
    'decision-gemini-hold',
    'agent-gemini-2.5-flash',
    SEEDED_COHORT_ID,
    SNAPSHOT_END,
    'HOLD',
    'No seeded edge is large enough to justify a position this cycle.',
    80,
    30,
    0.18,
    SNAPSHOT_END
  );

  db.prepare(`
    INSERT INTO trades (
      id, agent_id, market_id, position_id, decision_id, trade_type, side,
      shares, price, total_amount, implied_confidence, executed_at
    ) VALUES (?, ?, ?, ?, ?, 'BUY', 'YES', 10, 0.50, 5.00, 0.62, ?)
  `).run('trade-gpt-fed', 'agent-gpt-5.1', SEEDED_MARKET_ID, 'position-gpt-fed', 'decision-gpt-fed', SNAPSHOT_END);

  const insertSystemLog = db.prepare(`
    INSERT INTO system_logs (id, event_type, event_data, severity, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertSystemLog.run(
    'log-seeded-info',
    'admin_seed_info',
    JSON.stringify({ source: 'prepare-e2e-db', ready: true }),
    'info',
    SNAPSHOT_START
  );
  insertSystemLog.run(
    'log-seeded-warning',
    'admin_seed_warning',
    JSON.stringify({ warning: 'seeded browser warning' }),
    'warning',
    SNAPSHOT_END
  );
  insertSystemLog.run(
    'log-seeded-error',
    'admin_seed_error',
    JSON.stringify({ error: 'seeded browser error' }),
    'error',
    SNAPSHOT_END
  );
}

export const richScenarioMeta = {
  cohortId: SEEDED_COHORT_ID,
  exportFrom: SEEDED_EXPORT_FROM,
  exportTo: SEEDED_EXPORT_TO,
  marketId: SEEDED_MARKET_ID
};
