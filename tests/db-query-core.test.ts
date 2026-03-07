import { describe, expect, it, vi } from 'vitest';
import {
  createMarket,
  withDbQueryModules
} from '@/tests/helpers/db-query-test-utils';

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
      expect(agentsWithModels[0]?.model.id).toBe(agentsWithModels[0]?.model_id);
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
      expect(markets.getClosedMarkets().map(market => market.id)).toEqual([closedMarket.id, inserted.id]);

      markets.resolveMarket(activeLowVolume.id, 'YES');

      const resolved = markets.getMarketById(activeLowVolume.id)!;
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution_outcome).toBe('YES');
      expect(resolved.resolved_at).toBeTruthy();
    });
  });
});
