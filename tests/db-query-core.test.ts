import { describe, expect, it, vi } from 'vitest';
import {
  createMarket,
  withDbQueryModules
} from '@/tests/helpers/db-query-test-utils';
import { createTestBenchmarkConfigForLegacyModels } from '@/tests/helpers/db-fixtures';

describe('db query modules - core operations', () => {
  it('covers cohort lifecycle and completion status queries', async () => {
    await withDbQueryModules(({ agents, cohorts, db, decisions, markets, positions }) => {
      expect(cohorts.getLatestCohortNumber()).toBe(0);
      expect(cohorts.getCohortForCurrentWeek()).toBeUndefined();

      const cohortOne = cohorts.createCohort();
      expect(cohorts.createCohort().id).toBe(cohortOne.id);
      db.prepare('UPDATE cohorts SET started_at = ? WHERE id = ?').run('2020-01-01T00:00:00.000Z', cohortOne.id);
      const cohortTwo = cohorts.createCohort();

      expect(cohorts.getLatestCohortNumber()).toBe(2);
      expect(cohorts.getCohortById(cohortOne.id)?.id).toBe(cohortOne.id);
      expect(cohorts.getCohortByNumber(2)?.id).toBe(cohortTwo.id);
      expect(cohorts.getCohortForCurrentWeek()?.id).toBe(cohortTwo.id);
      expect(cohorts.getAllCohorts(1).map(cohort => cohort.id)).toEqual([cohortTwo.id]);
      expect(cohorts.getActiveCohorts().map(cohort => cohort.id)).toEqual([cohortTwo.id, cohortOne.id]);
      expect(cohorts.getDecisionEligibleCohorts(1).map(cohort => cohort.id)).toEqual([cohortTwo.id]);

      const cohortOneAgents = agents.createAgentsForCohort(cohortOne.id);
      const agent = cohortOneAgents[0]!;
      const market = createMarket(markets);
      const position = positions.upsertPosition(agent.id, market.id, 'YES', 5, 0.4, 2);
      decisions.createDecision({
        agent_id: agent.id,
        cohort_id: cohortOne.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });

      expect(cohorts.getCohortCompletionStatus(cohortOne.id)).toEqual({
        open_positions: 1,
        total_decisions: 1
      });

      expect(position.status).toBe('open');

      cohorts.completeCohort(cohortOne.id);

      const completed = cohorts.getCohortById(cohortOne.id)!;
      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeTruthy();
      expect(cohorts.getActiveCohorts().map(cohort => cohort.id)).toEqual([cohortTwo.id]);
    });
  });

  it('selects only the latest cohort numbers for decision eligibility', async () => {
    await withDbQueryModules(({ cohorts, db }) => {
      const created = Array.from({ length: 7 }, (_, index) => {
        const cohort = cohorts.createCohort();
        const startedAt = new Date(Date.UTC(2026, 0, 4 + index * 7)).toISOString();
        db.prepare('UPDATE cohorts SET started_at = ? WHERE id = ?').run(
          startedAt,
          cohort.id
        );
        return cohorts.getCohortById(cohort.id)!;
      });

      expect(cohorts.getActiveCohorts()).toHaveLength(7);
      expect(cohorts.getDecisionEligibleCohorts(5).map((cohort) => cohort.cohort_number))
        .toEqual([7, 6, 5, 4, 3]);
      expect(cohorts.getCohortDecisionStateByNumber(created[1]!)).toEqual({
        decision_eligible: false,
        decision_status: 'tracking_only'
      });
      expect(cohorts.getCohortDecisionStateByNumber(created[6]!)).toEqual({
        decision_eligible: true,
        decision_status: 'decisioning'
      });

      cohorts.completeCohort(created[6]!.id);

      expect(cohorts.getDecisionEligibleCohorts(5).map((cohort) => cohort.cohort_number))
        .toEqual([6, 5, 4, 3]);
      expect(cohorts.getCohortDecisionStateByNumber(cohorts.getCohortById(created[6]!.id)!)).toEqual({
        decision_eligible: false,
        decision_status: 'completed'
      });
      expect(cohorts.getActiveCohorts().map((cohort) => cohort.cohort_number))
        .toContain(2);
    });
  });

  it('covers agent reads, balance updates, and portfolio valuation branches', async () => {
    await withDbQueryModules(({ agents, cohorts, markets, models, positions }) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const cohort = cohorts.createCohort();
      const createdAgents = agents.createAgentsForCohort(cohort.id);
      const activeModels = models.getActiveModels();
      const agent = createdAgents[0]!;

      expect(models.getModelById(agent.model_id)?.id).toBe(agent.model_id);
      expect(agents.getAgentsByCohort(cohort.id)).toHaveLength(activeModels.length);
      expect(agents.getAgentById(agent.id)?.id).toBe(agent.id);
      expect(agents.getAgentByCohortAndModel(cohort.id, agent.model_id)?.id).toBe(agent.id);

      const agentsWithModels = agents.getAgentsWithModelsByCohort(cohort.id);
      expect(agentsWithModels).toHaveLength(activeModels.length);
      expect(agentsWithModels[0]?.model.family_id).toBeTruthy();
      expect(agentsWithModels[0]?.model.legacy_model_id).toBe(agentsWithModels[0]?.model_id);
      expect(agentsWithModels[0]?.model.openrouter_id).toBeTruthy();

      agents.updateAgentBalance(agent.id, 0, 0);
      expect(agents.getAgentById(agent.id)?.status).toBe('bankrupt');

      agents.updateAgentBalance(agent.id, 25, 100);
      expect(agents.getAgentById(agent.id)?.status).toBe('active');
      expect(warnSpy).toHaveBeenCalledTimes(1);

      agents.updateAgentBalance(agent.id, 250, 0);
      expect(agents.getAgentById(agent.id)?.status).toBe('active');
      expect(warnSpy).toHaveBeenCalledTimes(1);

      const market = createMarket(markets);
      const position = positions.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);
      positions.updatePositionMTM(position.id, 12, 7);

      expect(agents.calculateActualPortfolioValue(agent.id)).toBe(262);
      expect(() => agents.calculateActualPortfolioValue('missing-agent')).toThrow('Agent missing-agent not found');

      warnSpy.mockRestore();
    });
  });

  it('rejects agent creation against a cohort when a different benchmark config is passed later', async () => {
    await withDbQueryModules(async ({ agents, cohorts, db, models }) => {
      const legacyIds = models.getActiveModels().slice(0, 2).map((model) => model.id);
      db.prepare(`
        UPDATE models
        SET is_active = CASE WHEN id IN (?, ?) THEN 1 ELSE 0 END
      `).run(legacyIds[0], legacyIds[1]);

      const initialConfig = await createTestBenchmarkConfigForLegacyModels([legacyIds[0]]);
      const conflictingConfig = await createTestBenchmarkConfigForLegacyModels(legacyIds);
      const cohort = cohorts.createCohort(initialConfig.id);

      expect(() => agents.createAgentsForCohort(cohort.id, conflictingConfig.id)).toThrow(
        `Cohort ${cohort.id} is pinned to benchmark config ${initialConfig.id}, not ${conflictingConfig.id}`
      );
    });
  });

  it('throws when agent creation is requested for a missing cohort', async () => {
    await withDbQueryModules(({ agents }) => {
      expect(() => agents.createAgentsForCohort('missing-cohort')).toThrow(
        'Cohort missing-cohort not found'
      );
    });
  });

  it('throws when a legacy cohort row has no frozen config and no default benchmark config exists', async () => {
    await withDbQueryModules(({ agents, db }) => {
      db.pragma('foreign_keys = OFF');
      db.exec('DROP TRIGGER IF EXISTS cohorts_require_benchmark_config_insert');
      db.exec('DROP TRIGGER IF EXISTS cohorts_require_benchmark_config_update');
      db.exec('ALTER TABLE cohorts RENAME TO cohorts_strict_backup');
      db.exec(`
        CREATE TABLE cohorts (
          id TEXT PRIMARY KEY,
          cohort_number INTEGER NOT NULL UNIQUE,
          started_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          completed_at TEXT,
          methodology_version TEXT NOT NULL DEFAULT 'v1',
          benchmark_config_id TEXT,
          initial_balance REAL NOT NULL DEFAULT 10000.00,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (methodology_version) REFERENCES methodology_versions(version),
          FOREIGN KEY (benchmark_config_id) REFERENCES benchmark_configs(id)
        )
      `);
      db.pragma('foreign_keys = ON');
      db.prepare('UPDATE benchmark_configs SET is_default_for_future_cohorts = 0').run();
      db.prepare(`
        INSERT INTO cohorts (
          id,
          cohort_number,
          started_at,
          methodology_version,
          benchmark_config_id
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        'legacy-null-config-cohort',
        1,
        '2030-01-07T00:00:00.000Z',
        'v1',
        null
      );

      expect(() => agents.createAgentsForCohort('legacy-null-config-cohort', null)).toThrow(
        'No default benchmark config is configured for agent creation'
      );
    });
  });

  it('rejects attempts to remove an agent row\'s frozen benchmark lineage', async () => {
    await withDbQueryModules(({ agents, cohorts, db }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);

      expect(() => {
        db.prepare(`
          UPDATE agents
          SET family_id = NULL,
              release_id = NULL,
              benchmark_config_model_id = NULL
          WHERE id = ?
        `).run(agent!.id);
      }).toThrow(/NOT NULL constraint failed|agents frozen lineage is required/);

      expect(agents.getAgentsWithModelsByCohort(cohort.id)[0]?.id).toBe(agent!.id);
    });
  });

  it('throws when a legacy agent row is read before frozen lineage has been backfilled', async () => {
    await withDbQueryModules(({ agents, cohorts, db, models }) => {
      const cohort = cohorts.createCohort();
      const model = models.getActiveModels()[0]!;

      db.pragma('foreign_keys = OFF');
      db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_insert');
      db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_update');
      db.exec('DROP VIEW IF EXISTS decision_benchmark_identity_v');
      db.exec('DROP VIEW IF EXISTS agent_benchmark_identity_v');
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
      db.exec(`
        CREATE VIEW agent_benchmark_identity_v AS
        SELECT
          a.id as agent_id,
          a.cohort_id,
          a.model_id as legacy_model_id,
          a.family_id as family_id,
          f.slug as family_slug,
          bcm.family_display_name_snapshot as family_display_name,
          bcm.short_display_name_snapshot as short_display_name,
          a.release_id as release_id,
          r.release_slug as release_slug,
          bcm.release_display_name_snapshot as release_display_name,
          bcm.provider_snapshot as provider,
          bcm.color_snapshot as color,
          bcm.openrouter_id_snapshot as openrouter_id,
          bcm.input_price_per_million_snapshot as input_price_per_million,
          bcm.output_price_per_million_snapshot as output_price_per_million,
          bcm.id as benchmark_config_model_id
        FROM agents a
        LEFT JOIN benchmark_config_models bcm ON bcm.id = a.benchmark_config_model_id
        LEFT JOIN model_families f ON f.id = a.family_id
        LEFT JOIN model_releases r ON r.id = a.release_id
      `);

      db.prepare(`
        INSERT INTO agents (
          id,
          cohort_id,
          model_id,
          cash_balance,
          total_invested,
          status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run('agent-legacy-unbackfilled', cohort.id, model.id, 10000, 0, 'active');

      expect(() => agents.getAgentsWithModelsByCohort(cohort.id)).toThrow(
        'Agent agent-legacy-unbackfilled is missing frozen benchmark lineage'
      );
    });
  });

  it('falls back to frozen family and release ids when catalog slug rows are missing', async () => {
    await withDbQueryModules(({ agents, cohorts, db }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const hydratedAgent = agents.getAgentsWithModelsByCohort(cohort.id)[0]!;

      db.pragma('foreign_keys = OFF');
      db.prepare('DELETE FROM model_releases WHERE id = ?').run(hydratedAgent.release_id);
      db.prepare('DELETE FROM model_families WHERE id = ?').run(hydratedAgent.family_id);
      db.pragma('foreign_keys = ON');

      const degradedAgent = agents.getAgentsWithModelsByCohort(cohort.id)[0]!;
      expect(degradedAgent.model.family_slug).toBe(hydratedAgent.family_id);
      expect(degradedAgent.model.release_slug).toBe(hydratedAgent.release_id);
      expect(degradedAgent.model.display_name).toBe(hydratedAgent.model.display_name);
      expect(degradedAgent.model.release_name).toBe(hydratedAgent.model.release_name);
    });
  });

  it('covers market inserts, updates, reads, sorting, and resolution transitions', async () => {
    await withDbQueryModules(({ markets }) => {
      const defaulted = markets.upsertMarket({
        polymarket_id: 'pm-default'
      });
      const inserted = markets.upsertMarket({
        polymarket_id: 'pm-inserted',
        question: 'Inserted market'
      });

      expect(defaulted.question).toBe('');
      expect(inserted.market_type).toBe('binary');
      expect(inserted.status).toBe('active');
      expect(inserted.close_date).toBeTruthy();

      const updated = markets.upsertMarket({
        polymarket_id: inserted.polymarket_id,
        volume: 2500,
        status: 'closed',
        question: undefined
      });

      const activeHighVolume = createMarket(markets, {
        question: 'High volume active',
        volume: 5000
      });
      const activeLowVolume = createMarket(markets, {
        question: 'Low volume active',
        volume: 100
      });
      const closedMarket = createMarket(markets, {
        question: 'Closed market',
        status: 'closed',
        volume: 750
      });
      const unresolvedResolvedMarket = createMarket(markets, {
        question: 'Resolved without outcome',
        status: 'resolved',
        volume: 600
      });

      expect(updated.question).toBe('Inserted market');
      expect(updated.volume).toBe(2500);
      expect(markets.getMarketById(inserted.id)?.id).toBe(inserted.id);
      expect(markets.getMarketByPolymarketId(inserted.polymarket_id)?.id).toBe(inserted.id);
      expect(markets.getAllMarkets(2).map(market => market.question)).toEqual([
        'High volume active',
        'Inserted market'
      ]);
      expect(markets.getActiveMarkets(10).map(market => market.question)).toEqual([
        'High volume active',
        'Low volume active',
        ''
      ]);
      expect(markets.getTopMarketsByVolume(1).map(market => market.id)).toEqual([activeHighVolume.id]);
      const pendingResolutionIds = markets.getClosedMarkets().map(market => market.id);
      expect(pendingResolutionIds).toHaveLength(3);
      expect(pendingResolutionIds).toEqual(expect.arrayContaining([
        unresolvedResolvedMarket.id,
        closedMarket.id,
        inserted.id
      ]));

      markets.resolveMarket(activeLowVolume.id, 'YES');
      markets.resolveMarket(unresolvedResolvedMarket.id, 'NO');

      const resolved = markets.getMarketById(activeLowVolume.id)!;
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution_outcome).toBe('YES');
      expect(resolved.resolved_at).toBeTruthy();
      const closedIdsAfterResolution = markets.getClosedMarkets().map(market => market.id);
      expect(closedIdsAfterResolution).toHaveLength(2);
      expect(closedIdsAfterResolution).toEqual(expect.arrayContaining([closedMarket.id, inserted.id]));
    });
  });
});
