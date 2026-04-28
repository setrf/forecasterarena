import { describe, expect, it } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';
import { createTestBenchmarkConfigForLegacyModels } from '@/tests/helpers/db-fixtures';

type DbModule = typeof import('@/lib/db');
type AgentsModule = typeof import('@/lib/db/queries/agents');
type BrierScoresModule = typeof import('@/lib/db/queries/brier-scores');
type CohortsModule = typeof import('@/lib/db/queries/cohorts');
type CostsModule = typeof import('@/lib/db/queries/costs');
type LeaderboardModule = typeof import('@/lib/db/queries/leaderboard');
type LogsModule = typeof import('@/lib/db/queries/logs');
type MarketsModule = typeof import('@/lib/db/queries/markets');
type ModelsModule = typeof import('@/lib/db/queries/models');
type PositionsModule = typeof import('@/lib/db/queries/positions');
type SnapshotsModule = typeof import('@/lib/db/queries/snapshots');
type TradesModule = typeof import('@/lib/db/queries/trades');

interface LoadedModules {
  agents: AgentsModule;
  brierScores: BrierScoresModule;
  cohorts: CohortsModule;
  costs: CostsModule;
  db: ReturnType<DbModule['getDb']>;
  leaderboard: LeaderboardModule;
  logs: LogsModule;
  markets: MarketsModule;
  models: ModelsModule;
  snapshots: SnapshotsModule;
  positions: PositionsModule;
  trades: TradesModule;
}

let sequence = 0;

function uniqueId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

async function withModules(run: (modules: LoadedModules) => Promise<void> | void): Promise<void> {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

  try {
    const dbModule = await import('@/lib/db');
    const [
      agents,
      brierScores,
      cohorts,
      costs,
      leaderboard,
      logs,
      markets,
      models,
      snapshots,
      positions,
      trades
    ] = await Promise.all([
      import('@/lib/db/queries/agents'),
      import('@/lib/db/queries/brier-scores'),
      import('@/lib/db/queries/cohorts'),
      import('@/lib/db/queries/costs'),
      import('@/lib/db/queries/leaderboard'),
      import('@/lib/db/queries/logs'),
      import('@/lib/db/queries/markets'),
      import('@/lib/db/queries/models'),
      import('@/lib/db/queries/snapshots'),
      import('@/lib/db/queries/positions'),
      import('@/lib/db/queries/trades')
    ]);

    await run({
      agents,
      brierScores,
      cohorts,
      costs,
      db: dbModule.getDb(),
      leaderboard,
      logs,
      markets,
      models,
      snapshots,
      positions,
      trades
    });
  } finally {
    await ctx.cleanup();
  }
}

function createMarket(markets: MarketsModule, overrides: Partial<Parameters<MarketsModule['upsertMarket']>[0]> = {}) {
  return markets.upsertMarket({
    polymarket_id: uniqueId('pm'),
    question: uniqueId('question'),
    close_date: '2030-01-01T00:00:00.000Z',
    status: 'active',
    current_price: 0.5,
    volume: 1000,
    liquidity: 500,
    ...overrides
  });
}

describe('db query modules - support and reporting', () => {
  it('covers model queries and log filters', async () => {
    await withModules(({ db, logs, models }) => {
      const allModels = models.getAllModels();
      const disabledModel = allModels[0]!;

      db.prepare('UPDATE models SET is_active = 0 WHERE id = ?').run(disabledModel.id);

      expect(models.getModelById(disabledModel.id)?.id).toBe(disabledModel.id);
      expect(models.getAllModels()).toHaveLength(allModels.length);
      expect(models.getActiveModels()).toHaveLength(allModels.length - 1);
      expect(models.getActiveModels().some(model => model.id === disabledModel.id)).toBe(false);

      db.prepare(`
        INSERT INTO system_logs (id, event_type, event_data, severity, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(uniqueId('log'), 'older-info', '{"ok":true}', 'info', '2025-01-01T00:00:00.000Z');
      db.prepare(`
        INSERT INTO system_logs (id, event_type, event_data, severity, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(uniqueId('log'), 'middle-warning', '{"warn":true}', 'warning', '2025-01-01T00:00:01.000Z');
      db.prepare(`
        INSERT INTO system_logs (id, event_type, event_data, severity, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(uniqueId('log'), 'latest-error', '{"error":true}', 'error', '2025-01-01T00:00:02.000Z');

      expect(logs.getRecentLogs(2).map(log => log.event_type)).toEqual([
        'latest-error',
        'middle-warning'
      ]);
      expect(logs.getLogsBySeverity('warning', 1).map(log => log.event_type)).toEqual([
        'middle-warning'
      ]);
      expect(logs.getLogsBySeverity('info').map(log => log.event_type)).toEqual([
        'older-info'
      ]);
    });
  });

  it('covers brier score creation, deduplication, lookups, and averages', async () => {
    await withModules(({ agents, brierScores, cohorts, db, markets, positions, trades }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);

      const marketOne = createMarket(markets, { question: 'Brier market one' });
      const marketTwo = createMarket(markets, { question: 'Brier market two' });

      const positionOne = positions.upsertPosition(agent!.id, marketOne.id, 'YES', 10, 0.5, 5);
      const positionTwo = positions.upsertPosition(agent!.id, marketTwo.id, 'NO', 8, 0.4, 3.2);

      const tradeOne = trades.createTrade({
        agent_id: agent!.id,
        market_id: marketOne.id,
        position_id: positionOne.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.5,
        total_amount: 5
      });
      const tradeTwo = trades.createTrade({
        agent_id: agent!.id,
        market_id: marketTwo.id,
        position_id: positionTwo.id,
        trade_type: 'BUY',
        side: 'NO',
        shares: 8,
        price: 0.4,
        total_amount: 3.2
      });

      const firstScore = brierScores.createBrierScore({
        agent_id: agent!.id,
        trade_id: tradeOne.id,
        market_id: marketOne.id,
        forecast_probability: 0.8,
        actual_outcome: 1,
        brier_score: 0.04
      });
      const duplicateScore = brierScores.createBrierScore({
        agent_id: agent!.id,
        trade_id: tradeOne.id,
        market_id: marketOne.id,
        forecast_probability: 0.8,
        actual_outcome: 1,
        brier_score: 0.04
      });
      const secondScore = brierScores.createBrierScore({
        agent_id: agent!.id,
        trade_id: tradeTwo.id,
        market_id: marketTwo.id,
        forecast_probability: 0.3,
        actual_outcome: 0,
        brier_score: 0.09
      });

      db.prepare('UPDATE brier_scores SET calculated_at = ? WHERE id = ?').run(
        '2025-01-01T00:00:00.000Z',
        firstScore.id
      );
      db.prepare('UPDATE brier_scores SET calculated_at = ? WHERE id = ?').run(
        '2025-01-01T00:00:01.000Z',
        secondScore.id
      );

      expect(duplicateScore.id).toBe(firstScore.id);
      expect(brierScores.getBrierScoresByAgent(agent!.id).map(score => score.id)).toEqual([
        secondScore.id,
        firstScore.id
      ]);
      expect(brierScores.getAverageBrierScore(agent!.id)).toBeCloseTo(0.065, 10);
      expect(brierScores.getAverageBrierScore('missing-agent')).toBeNull();
    });
  });

  it('covers API cost aggregation by model', async () => {
    await withModules(({ costs, models }) => {
      const [modelOne, modelTwo] = models.getActiveModels();

      costs.createApiCost({
        model_id: modelOne!.id,
        tokens_input: 100,
        tokens_output: 50,
        cost_usd: 0.12
      });
      costs.createApiCost({
        model_id: modelOne!.id,
        tokens_input: 200,
        tokens_output: 100,
        cost_usd: 0.08
      });
      costs.createApiCost({
        model_id: modelTwo!.id,
        tokens_input: 75,
        tokens_output: 25,
        cost_usd: 0.2
      });

      expect(costs.getTotalCostsByModel()).toEqual({
        [modelOne!.id]: 0.2,
        [modelTwo!.id]: 0.2
      });
    });
  });

  it('prefers frozen decision lineage and falls back to the agent lineage snapshot for trades', async () => {
    await withModules(async ({ agents, cohorts, db }) => {
      const { getTradeLineageSnapshot } = await import('@/lib/db/queries/trade-lineage');
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const lineage = db.prepare(`
        SELECT family_id, release_id, benchmark_config_model_id
        FROM agents
        WHERE id = ?
      `).get(agent!.id) as {
        family_id: string;
        release_id: string;
        benchmark_config_model_id: string;
      };

      db.prepare(`
        INSERT INTO decisions (
          id,
          agent_id,
          cohort_id,
          decision_week,
          decision_timestamp,
          prompt_system,
          prompt_user,
          retry_count,
          action,
          family_id,
          release_id,
          benchmark_config_model_id
        ) VALUES (?, ?, ?, 1, ?, 'system', 'user', 0, 'HOLD', ?, ?, ?)
      `).run(
        'decision-with-lineage',
        agent!.id,
        cohort.id,
        '2025-01-01T00:00:00.000Z',
        lineage.family_id,
        lineage.release_id,
        lineage.benchmark_config_model_id
      );

      db.prepare(`
        INSERT INTO decisions (
          id,
          agent_id,
          cohort_id,
          decision_week,
          decision_timestamp,
          prompt_system,
          prompt_user,
          retry_count,
          action
        ) VALUES (?, ?, ?, 2, ?, 'system', 'user', 0, 'HOLD')
      `).run(
        'decision-without-lineage',
        agent!.id,
        cohort.id,
        '2025-01-02T00:00:00.000Z'
      );

      expect(getTradeLineageSnapshot({
        agentId: agent!.id,
        decisionId: 'decision-with-lineage'
      })).toEqual(lineage);

      expect(getTradeLineageSnapshot({
        agentId: agent!.id,
        decisionId: 'decision-without-lineage'
      })).toEqual(lineage);

      expect(() => getTradeLineageSnapshot({
        agentId: 'missing-agent'
      })).toThrow('Agent missing-agent is missing frozen trade lineage');
    });
  });

  it('infers frozen lineage for decision-linked API cost rows', async () => {
    await withModules(async ({ agents, cohorts, costs, db }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const decisionId = uniqueId('decision');

      db.prepare(`
        INSERT INTO decisions (
          id, agent_id, cohort_id, decision_week, decision_timestamp,
          prompt_system, prompt_user, retry_count, action
        ) VALUES (?, ?, ?, 1, ?, 'system', 'user', 0, 'HOLD')
      `).run(decisionId, agent!.id, cohort.id, '2025-01-01T00:00:00.000Z');

      const apiCost = costs.createApiCost({
        model_id: agent!.model_id,
        decision_id: decisionId,
        tokens_input: 120,
        tokens_output: 45,
        cost_usd: 0.42
      });
      const inferredUpdateApiCost = costs.createApiCost({
        model_id: agent!.model_id,
        decision_id: decisionId,
        tokens_input: 130,
        tokens_output: 48,
        cost_usd: 0.46
      });
      const updatedApiCost = costs.createApiCost({
        model_id: agent!.model_id,
        agent_id: agent!.id,
        family_id: agent!.family_id,
        release_id: agent!.release_id,
        benchmark_config_model_id: agent!.benchmark_config_model_id,
        decision_id: decisionId,
        tokens_input: 140,
        tokens_output: 50,
        cost_usd: 0.5
      });

      expect(apiCost).toMatchObject({
        decision_id: decisionId,
        agent_id: agent!.id,
        family_id: agent!.family_id,
        release_id: agent!.release_id,
        benchmark_config_model_id: agent!.benchmark_config_model_id
      });
      expect(inferredUpdateApiCost.id).toBe(apiCost.id);
      expect(inferredUpdateApiCost.agent_id).toBe(agent!.id);
      expect(inferredUpdateApiCost.cost_usd).toBe(0.46);
      expect(updatedApiCost.id).toBe(apiCost.id);
      expect(updatedApiCost.cost_usd).toBe(0.5);
      expect(costs.getTotalCostsByModel()[agent!.family_id!]).toBe(0.5);
    });
  });

  it('keeps API cost lineage stable because agent lineage cannot be nulled once written', async () => {
    await withModules(({ agents, cohorts, costs, db }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const decisionId = uniqueId('decision');

      db.prepare(`
        INSERT INTO decisions (
          id, agent_id, cohort_id, decision_week, decision_timestamp,
          prompt_system, prompt_user, retry_count, action
        ) VALUES (?, ?, ?, 1, ?, 'system', 'user', 0, 'HOLD')
      `).run(decisionId, agent!.id, cohort.id, '2025-01-01T00:00:00.000Z');

      const firstApiCost = costs.createApiCost({
        model_id: agent!.model_id,
        decision_id: decisionId,
        tokens_input: 90,
        tokens_output: 30,
        cost_usd: 0.15
      });

      expect(() => db.prepare(`
        UPDATE agents
        SET family_id = NULL,
            release_id = NULL,
            benchmark_config_model_id = NULL
        WHERE id = ?
      `).run(agent!.id)).toThrow();

      expect(costs.getTotalCostsByModel()).toEqual({
        [agent!.family_id]: 0.15
      });
    });
  });

  it('rejects agent-linked API cost rows when a legacy agent is still missing frozen lineage', async () => {
    await withModules(({ cohorts, costs, db, models }) => {
      const cohort = cohorts.createCohort();
      const model = models.getActiveModels()[0]!;

      db.pragma('foreign_keys = OFF');
      db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_insert');
      db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_update');
      db.exec('ALTER TABLE agents RENAME TO agents_strict_backup');
      db.exec(`
        CREATE TABLE agents (
          id TEXT PRIMARY KEY,
          cohort_id TEXT NOT NULL,
          model_id TEXT NOT NULL,
          family_id TEXT,
          release_id TEXT,
          benchmark_config_model_id TEXT,
          cash_balance REAL NOT NULL DEFAULT 10000.00,
          total_invested REAL NOT NULL DEFAULT 0.00,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cohort_id) REFERENCES cohorts(id),
          FOREIGN KEY (model_id) REFERENCES models(id),
          FOREIGN KEY (family_id) REFERENCES model_families(id),
          FOREIGN KEY (release_id) REFERENCES model_releases(id),
          FOREIGN KEY (benchmark_config_model_id) REFERENCES benchmark_config_models(id),
          UNIQUE(cohort_id, model_id)
        )
      `);
      db.pragma('foreign_keys = ON');

      db.prepare(`
        INSERT INTO agents (
          id,
          cohort_id,
          model_id,
          cash_balance,
          total_invested,
          status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run('agent-missing-lineage', cohort.id, model.id, 10000, 0, 'active');

      expect(() => costs.createApiCost({
        model_id: model.id,
        agent_id: 'agent-missing-lineage',
        tokens_input: 10,
        tokens_output: 5,
        cost_usd: 0.01
      })).toThrow('API cost rows linked to a cohort agent must carry complete frozen lineage');
    });
  });

  it('covers snapshot upserts and query ordering helpers', async () => {
    await withModules(({ agents, cohorts, snapshots }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);

      const first = snapshots.createPortfolioSnapshot({
        agent_id: agent!.id,
        snapshot_timestamp: '2025-01-01T00:00:00.000Z',
        cash_balance: 10000,
        positions_value: 0,
        total_value: 10000,
        total_pnl: 0,
        total_pnl_percent: 0
      });
      const updated = snapshots.createPortfolioSnapshot({
        agent_id: agent!.id,
        snapshot_timestamp: '2025-01-01T00:00:00.000Z',
        cash_balance: 10100,
        positions_value: 50,
        total_value: 10150,
        total_pnl: 150,
        total_pnl_percent: 1.5,
        brier_score: 0.2,
        num_resolved_bets: 2
      });
      const latest = snapshots.createPortfolioSnapshot({
        agent_id: agent!.id,
        snapshot_timestamp: '2025-01-02T00:00:00.000Z',
        cash_balance: 10200,
        positions_value: 75,
        total_value: 10275,
        total_pnl: 275,
        total_pnl_percent: 2.75,
        brier_score: 0.18,
        num_resolved_bets: 3
      });

      expect(first.num_resolved_bets).toBe(0);
      expect(updated.id).toBe(first.id);
      expect(updated.cash_balance).toBe(10100);
      expect(updated.num_resolved_bets).toBe(2);

      expect(snapshots.getSnapshotsByAgent(agent!.id).map(snapshot => snapshot.snapshot_timestamp)).toEqual([
        '2025-01-01T00:00:00.000Z',
        '2025-01-02T00:00:00.000Z'
      ]);
      expect(snapshots.getSnapshotsByAgent(agent!.id, 1).map(snapshot => snapshot.id)).toEqual([latest.id]);
      expect(snapshots.getLatestSnapshot(agent!.id)?.id).toBe(latest.id);
    });
  });

  it('covers aggregate leaderboard calculations', async () => {
    await withModules(async ({ agents, brierScores, cohorts, db, leaderboard, markets, models, positions, snapshots, trades }) => {
      const activeModels = models.getActiveModels();
      const allowedIds = activeModels.slice(0, 2).map(model => model.id);
      db.prepare(
        `UPDATE models SET is_active = CASE WHEN id IN (?, ?) THEN 1 ELSE 0 END`
      ).run(allowedIds[0], allowedIds[1]);

      const benchmarkConfig = await createTestBenchmarkConfigForLegacyModels(allowedIds);
      const cohort = cohorts.createCohort(benchmarkConfig.id);
      const createdAgents = agents.createAgentsForCohort(cohort.id, benchmarkConfig.id);
      const agentOne = createdAgents.find(agent => agent.model_id === allowedIds[0])!;
      const agentTwo = createdAgents.find(agent => agent.model_id === allowedIds[1])!;
      const familyOne = db.prepare('SELECT id, slug FROM model_families WHERE legacy_model_id = ?').get(allowedIds[0]) as { id: string; slug: string };
      const familyTwo = db.prepare('SELECT id, slug FROM model_families WHERE legacy_model_id = ?').get(allowedIds[1]) as { id: string; slug: string };

      snapshots.createPortfolioSnapshot({
        agent_id: agentOne.id,
        snapshot_timestamp: '2025-01-01T00:00:00.000Z',
        cash_balance: 10300,
        positions_value: 0,
        total_value: 10300,
        total_pnl: 300,
        total_pnl_percent: 3,
        brier_score: 0.04,
        num_resolved_bets: 2
      });
      snapshots.createPortfolioSnapshot({
        agent_id: agentTwo.id,
        snapshot_timestamp: '2025-01-01T00:00:00.000Z',
        cash_balance: 9900,
        positions_value: 0,
        total_value: 9900,
        total_pnl: -100,
        total_pnl_percent: -1,
        brier_score: 0.09,
        num_resolved_bets: 1
      });

      const marketOne = createMarket(markets, { question: 'Leaderboard winner' });
      const marketTwo = createMarket(markets, { question: 'Leaderboard also winner' });
      const positionOne = positions.upsertPosition(agentOne.id, marketOne.id, 'YES', 10, 0.6, 6);
      const positionTwo = positions.upsertPosition(agentTwo.id, marketTwo.id, 'NO', 10, 0.4, 4);

      const tradeOne = trades.createTrade({
        agent_id: agentOne.id,
        market_id: marketOne.id,
        position_id: positionOne.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.6,
        total_amount: 6
      });
      const tradeTwo = trades.createTrade({
        agent_id: agentTwo.id,
        market_id: marketTwo.id,
        position_id: positionTwo.id,
        trade_type: 'BUY',
        side: 'NO',
        shares: 10,
        price: 0.4,
        total_amount: 4
      });

      markets.resolveMarket(marketOne.id, 'YES');
      markets.resolveMarket(marketTwo.id, 'NO');

      brierScores.createBrierScore({
        agent_id: agentOne.id,
        trade_id: tradeOne.id,
        market_id: marketOne.id,
        forecast_probability: 0.8,
        actual_outcome: 1,
        brier_score: 0.04
      });
      brierScores.createBrierScore({
        agent_id: agentTwo.id,
        trade_id: tradeTwo.id,
        market_id: marketTwo.id,
        forecast_probability: 0.7,
        actual_outcome: 1,
        brier_score: 0.09
      });

      const leaderboardEntries = leaderboard.getAggregateLeaderboard();

      expect(leaderboardEntries).toHaveLength(2);
      expect(leaderboardEntries[0]).toMatchObject({
        family_slug: familyOne.slug,
        family_id: familyOne.id,
        legacy_model_id: allowedIds[0],
        total_pnl: 300,
        total_pnl_percent: 3,
        avg_brier_score: 0.04,
        num_cohorts: 1,
        num_resolved_bets: 2,
        win_rate: 1
      });
      expect(leaderboardEntries[1]).toMatchObject({
        family_slug: familyTwo.slug,
        family_id: familyTwo.id,
        legacy_model_id: allowedIds[1],
        total_pnl: -100,
        total_pnl_percent: -1,
        avg_brier_score: 0.09,
        num_cohorts: 1,
        num_resolved_bets: 1,
        win_rate: 1
      });
    });
  });

  it('falls back to live position values when snapshots have not been taken yet', async () => {
    await withModules(async ({ agents, cohorts, db, leaderboard, markets, models, positions }) => {
      const activeModels = models.getActiveModels();
      const allowedIds = activeModels.slice(0, 2).map(model => model.id);
      db.prepare(
        `UPDATE models SET is_active = CASE WHEN id IN (?, ?) THEN 1 ELSE 0 END`
      ).run(allowedIds[0], allowedIds[1]);

      const benchmarkConfig = await createTestBenchmarkConfigForLegacyModels(allowedIds);
      const cohort = cohorts.createCohort(benchmarkConfig.id);
      const createdAgents = agents.createAgentsForCohort(cohort.id, benchmarkConfig.id);
      const agentOne = createdAgents.find(agent => agent.model_id === allowedIds[0])!;
      const agentTwo = createdAgents.find(agent => agent.model_id === allowedIds[1])!;
      const familyOne = db.prepare('SELECT id, slug FROM model_families WHERE legacy_model_id = ?').get(allowedIds[0]) as { id: string; slug: string };
      const familyTwo = db.prepare('SELECT id, slug FROM model_families WHERE legacy_model_id = ?').get(allowedIds[1]) as { id: string; slug: string };

      const marketOne = createMarket(markets, { question: 'Fallback positive pnl' });
      const marketTwo = createMarket(markets, { question: 'Fallback negative pnl' });

      agents.updateAgentBalance(agentOne.id, 9_900, 100);
      agents.updateAgentBalance(agentTwo.id, 9_800, 200);

      const positionOne = positions.upsertPosition(agentOne.id, marketOne.id, 'YES', 250, 0.4, 100);
      const positionTwo = positions.upsertPosition(agentTwo.id, marketTwo.id, 'YES', 400, 0.5, 200);

      positions.updatePositionMTM(positionOne.id, 120, 20);
      positions.updatePositionMTM(positionTwo.id, 180, -20);

      const leaderboardEntries = leaderboard.getAggregateLeaderboard();

      expect(leaderboardEntries).toHaveLength(2);
      expect(leaderboardEntries[0]).toMatchObject({
        family_slug: familyOne.slug,
        family_id: familyOne.id,
        legacy_model_id: allowedIds[0],
        total_pnl: 20,
        total_pnl_percent: 0.2,
        num_cohorts: 1,
        num_resolved_bets: 0
      });
      expect(leaderboardEntries[1]).toMatchObject({
        family_slug: familyTwo.slug,
        family_id: familyTwo.id,
        legacy_model_id: allowedIds[1],
        total_pnl: -20,
        total_pnl_percent: -0.2,
        num_cohorts: 1,
        num_resolved_bets: 0
      });
    });
  });

  it('covers cohort summary aggregation', async () => {
    await withModules(({ agents, cohorts, db, leaderboard, markets, models, positions, trades }) => {
      const cohortOne = cohorts.createCohort();
      db.prepare('UPDATE cohorts SET started_at = ? WHERE id = ?').run('2025-01-01T00:00:00.000Z', cohortOne.id);
      const cohortTwo = cohorts.createCohort();
      const cohortOneAgents = agents.createAgentsForCohort(cohortOne.id);
      const cohortTwoAgents = agents.createAgentsForCohort(cohortTwo.id);

      db.prepare('UPDATE cohorts SET started_at = ? WHERE id = ?').run('2025-01-08T00:00:00.000Z', cohortTwo.id);

      const tradedMarket = createMarket(markets, { question: 'Summary market' });
      const position = positions.upsertPosition(cohortTwoAgents[0]!.id, tradedMarket.id, 'YES', 5, 0.5, 2.5);

      trades.createTrade({
        agent_id: cohortTwoAgents[0]!.id,
        market_id: tradedMarket.id,
        position_id: position.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 5,
        price: 0.5,
        total_amount: 2.5
      });

      const summaries = leaderboard.getCohortSummaries();

      expect(summaries[0]).toMatchObject({
        id: cohortTwo.id,
        cohort_number: 2,
        decision_eligible: true,
        decision_status: 'decisioning',
        num_agents: models.getActiveModels().length,
        total_markets_traded: 1
      });
      expect(summaries[1]).toMatchObject({
        id: cohortOne.id,
        cohort_number: 1,
        decision_eligible: true,
        decision_status: 'decisioning',
        num_agents: cohortOneAgents.length,
        total_markets_traded: 0
      });
    });
  });
});
