import { describe, expect, it } from 'vitest';
import {
  createMarket,
  withDbQueryModules
} from '@/tests/helpers/db-query-test-utils';

describe('db query modules - positions and snapshots', () => {
  it('covers position queries, update paths, and reduction edge cases', async () => {
    await withDbQueryModules(({ agents, cohorts, db, decisions, markets, positions, trades }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const decision = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });

      const activeMarket = createMarket(markets, { question: 'Active market' });
      const closedMarket = createMarket(markets, { question: 'Closed market', status: 'closed' });

      const openPosition = positions.upsertPosition(agent!.id, activeMarket.id, 'YES', 10, 0.4, 4);
      const mergedPosition = positions.upsertPosition(agent!.id, activeMarket.id, 'YES', 5, 0.8, 4);
      const closedMarketPosition = positions.upsertPosition(agent!.id, closedMarket.id, 'NO', 8, 0.3, 2.4);
      const nullCurrentValueMergeMarket = createMarket(markets, { question: 'Null current value merge market' });
      const nullCurrentValueReduceMarket = createMarket(markets, { question: 'Null current value reduce market' });
      const repricedReduceMarket = createMarket(markets, { question: 'Repriced reduce market' });
      const reopenMarket = createMarket(markets, { question: 'Reopen market side' });
      const nullCurrentValueMergePosition = positions.upsertPosition(
        agent!.id,
        nullCurrentValueMergeMarket.id,
        'YES',
        4,
        0.5,
        2
      );
      const nullCurrentValueReducePosition = positions.upsertPosition(
        agent!.id,
        nullCurrentValueReduceMarket.id,
        'NO',
        10,
        0.3,
        3
      );
      const repricedReducePosition = positions.upsertPosition(
        agent!.id,
        repricedReduceMarket.id,
        'YES',
        10,
        0.5,
        5
      );
      positions.updatePositionMTM(repricedReducePosition.id, 8, 3);
      const initialReopenPosition = positions.upsertPosition(agent!.id, reopenMarket.id, 'YES', 5, 0.4, 2);

      expect(mergedPosition.shares).toBe(15);
      expect(mergedPosition.avg_entry_price).toBeCloseTo(8 / 15, 10);
      expect(positions.getPositionById(openPosition.id)?.id).toBe(openPosition.id);
      expect(positions.getPosition(agent!.id, activeMarket.id, 'YES')?.id).toBe(openPosition.id);
      expect(
        positions.getAllOpenPositions(agent!.id).map(position => position.market_id).sort()
      ).toEqual(
        [
          activeMarket.id,
          closedMarket.id,
          nullCurrentValueMergeMarket.id,
          nullCurrentValueReduceMarket.id,
          repricedReduceMarket.id,
          reopenMarket.id
        ].sort()
      );
      expect(positions.getOpenPositions(agent!.id).map(position => position.market_id).sort()).toEqual(
        [
          activeMarket.id,
          nullCurrentValueMergeMarket.id,
          nullCurrentValueReduceMarket.id,
          repricedReduceMarket.id,
          reopenMarket.id
        ].sort()
      );

      positions.updatePositionMTM(openPosition.id, 11, 3);

      trades.createTrade({
        agent_id: agent!.id,
        market_id: activeMarket.id,
        position_id: openPosition.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.4,
        total_amount: 4
      });

      expect(positions.getPositionsWithMarkets(agent!.id)[0]).toMatchObject({
        id: openPosition.id,
        market_question: 'Active market',
        opening_decision_id: decision.id
      });
      expect(positions.getPositionsByMarket(activeMarket.id).map(position => position.id)).toEqual([openPosition.id]);
      expect(() => positions.upsertPosition(agent!.id, activeMarket.id, 'YES', -15, 0.2, -3)).toThrow(
        'Cannot calculate avg price: newShares is 0'
      );

      db.prepare('UPDATE positions SET current_value = NULL WHERE id = ?').run(nullCurrentValueMergePosition.id);
      const mergedWithFallbackCurrentValue = positions.upsertPosition(
        agent!.id,
        nullCurrentValueMergeMarket.id,
        'YES',
        2,
        0.25,
        0.5
      );
      expect(mergedWithFallbackCurrentValue).toMatchObject({
        id: nullCurrentValueMergePosition.id,
        shares: 6,
        total_cost: 2.5,
        current_value: 2.5,
        unrealized_pnl: 0
      });

      positions.reducePosition('missing-position', 1);
      positions.reducePosition(openPosition.id, 5);
      expect(positions.getPositionById(openPosition.id)?.shares).toBe(10);
      expect(positions.getPositionById(openPosition.id)?.total_cost).toBeCloseTo(8 * (10 / 15), 10);

      db.prepare('UPDATE positions SET current_value = NULL WHERE id = ?').run(nullCurrentValueReducePosition.id);
      positions.reducePosition(nullCurrentValueReducePosition.id, 4);
      const reducedWithFallbackCurrentValue = positions.getPositionById(nullCurrentValueReducePosition.id)!;
      expect(reducedWithFallbackCurrentValue.id).toBe(nullCurrentValueReducePosition.id);
      expect(reducedWithFallbackCurrentValue.shares).toBe(6);
      expect(reducedWithFallbackCurrentValue.total_cost).toBeCloseTo(1.8, 10);
      expect(reducedWithFallbackCurrentValue.current_value).toBeCloseTo(1.8, 10);
      expect(reducedWithFallbackCurrentValue.unrealized_pnl).toBeCloseTo(0, 10);

      positions.reducePosition(repricedReducePosition.id, 4, 0.9);
      const repricedRemainder = positions.getPositionById(repricedReducePosition.id)!;
      expect(repricedRemainder.shares).toBe(6);
      expect(repricedRemainder.total_cost).toBeCloseTo(3, 10);
      expect(repricedRemainder.current_value).toBeCloseTo(5.4, 10);
      expect(repricedRemainder.unrealized_pnl).toBeCloseTo(2.4, 10);

      positions.reducePosition(initialReopenPosition.id, 5);
      const reopenedPosition = positions.upsertPosition(agent!.id, reopenMarket.id, 'YES', 2, 0.7, 1.4);
      expect(positions.getPositionById(initialReopenPosition.id)?.status).toBe('closed');
      expect(reopenedPosition.id).not.toBe(initialReopenPosition.id);
      expect(positions.getPosition(agent!.id, reopenMarket.id, 'YES')?.id).toBe(reopenedPosition.id);

      positions.reducePosition(closedMarketPosition.id, 8);
      expect(positions.getPositionById(closedMarketPosition.id)?.status).toBe('closed');

      const invalidPosition = positions.upsertPosition(agent!.id, createMarket(markets).id, 'A', 2, 0.5, 1);
      db.prepare('UPDATE positions SET shares = 0 WHERE id = ?').run(invalidPosition.id);
      expect(() => positions.reducePosition(invalidPosition.id, 1)).toThrow(
        `Cannot reduce position ${invalidPosition.id}: shares is 0`
      );

      positions.settlePosition(openPosition.id);
      const settled = positions.getPositionById(openPosition.id)!;
      expect(settled.status).toBe('settled');
      expect(settled.current_value).toBe(0);
      expect(settled.unrealized_pnl).toBe(0);
    });
  });

  it('returns closed and resolved position history with market metadata', async () => {
    await withDbQueryModules(({ agents, cohorts, db, decisions, markets, positions, trades }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const decision = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });

      const exitedMarket = createMarket(markets, { question: 'Exited market', status: 'active' });
      const cancelledMarket = createMarket(markets, { question: 'Cancelled market', status: 'resolved' });
      const wonMarket = createMarket(markets, { question: 'Won market', status: 'resolved' });
      const pendingMarket = createMarket(markets, { question: 'Pending market', status: 'closed' });
      const unknownMarket = createMarket(markets, { question: 'Unknown market', status: 'resolved' });

      const exitedPosition = positions.upsertPosition(agent!.id, exitedMarket.id, 'YES', 5, 0.4, 2);
      const cancelledPosition = positions.upsertPosition(agent!.id, cancelledMarket.id, 'YES', 3, 0.3, 0.9);
      const wonPosition = positions.upsertPosition(agent!.id, wonMarket.id, 'YES', 4, 0.25, 1);
      const pendingPosition = positions.upsertPosition(agent!.id, pendingMarket.id, 'NO', 6, 0.2, 1.2);
      const unknownPosition = positions.upsertPosition(agent!.id, unknownMarket.id, 'MAYBE', 2, 0.5, 1);

      trades.createTrade({
        agent_id: agent!.id,
        market_id: exitedMarket.id,
        position_id: exitedPosition.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 5,
        price: 0.4,
        total_amount: 2
      });
      trades.createTrade({
        agent_id: agent!.id,
        market_id: exitedMarket.id,
        position_id: exitedPosition.id,
        decision_id: decision.id,
        trade_type: 'SELL',
        side: 'YES',
        shares: 5,
        price: 0.7,
        total_amount: 3.5,
        cost_basis: 2,
        realized_pnl: 1.5
      });

      positions.reducePosition(exitedPosition.id, 5);
      positions.settlePosition(cancelledPosition.id);
      positions.settlePosition(wonPosition.id);
      db.prepare(
        'UPDATE markets SET resolution_outcome = ?, resolved_at = ?, status = ? WHERE id = ?'
      ).run('CANCELLED', '2030-02-01T00:00:00.000Z', 'resolved', cancelledMarket.id);
      db.prepare(
        'UPDATE markets SET resolution_outcome = ?, resolved_at = ?, status = ? WHERE id = ?'
      ).run('YES', '2030-02-01T00:00:00.000Z', 'resolved', wonMarket.id);
      db.prepare(
        'UPDATE markets SET resolution_outcome = ?, resolved_at = ?, status = ? WHERE id = ?'
      ).run('NO', '2030-02-01T00:00:00.000Z', 'resolved', unknownMarket.id);

      const history = positions.getClosedPositionsWithMarkets(agent!.id);
      const byQuestion = Object.fromEntries(history.map(entry => [entry.market_question, entry])) as Record<string, any>;

      expect(byQuestion['Exited market']).toMatchObject({
        outcome: 'EXITED',
        settlement_value: 3.5,
        pnl: 1.5,
        opening_decision_id: decision.id
      });
      expect(byQuestion['Cancelled market']).toMatchObject({
        outcome: 'CANCELLED',
        settlement_value: 0.9,
        pnl: 0
      });
      expect(byQuestion['Won market']).toMatchObject({
        outcome: 'WON',
        settlement_value: 4,
        pnl: 3
      });
      expect(byQuestion['Pending market']).toMatchObject({
        outcome: 'PENDING',
        settlement_value: null,
        pnl: null
      });
      expect(byQuestion['Unknown market']).toMatchObject({
        outcome: 'UNKNOWN',
        settlement_value: null,
        pnl: null
      });

      expect(history).toHaveLength(5);
      expect(pendingPosition.status).toBe('open');
      expect(unknownPosition.status).toBe('open');
    });
  });

  it('covers snapshot upserts and ordering modes', async () => {
    await withDbQueryModules(({ agents, cohorts, snapshots }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);

      const first = snapshots.createPortfolioSnapshot({
        agent_id: agent!.id,
        snapshot_timestamp: '2025-01-01T00:00:00.000Z',
        cash_balance: 100,
        positions_value: 10,
        total_value: 110,
        total_pnl: 10,
        total_pnl_percent: 10
      });

      const second = snapshots.createPortfolioSnapshot({
        agent_id: agent!.id,
        snapshot_timestamp: '2025-01-02T00:00:00.000Z',
        cash_balance: 120,
        positions_value: 30,
        total_value: 150,
        total_pnl: 50,
        total_pnl_percent: 50,
        brier_score: 0.12,
        num_resolved_bets: 3
      });

      const updated = snapshots.createPortfolioSnapshot({
        agent_id: agent!.id,
        snapshot_timestamp: '2025-01-01T00:00:00.000Z',
        cash_balance: 90,
        positions_value: 20,
        total_value: 110,
        total_pnl: 10,
        total_pnl_percent: 10,
        num_resolved_bets: 1
      });

      expect(first.num_resolved_bets).toBe(0);
      expect(second.num_resolved_bets).toBe(3);
      expect(updated.id).toBe(first.id);
      expect(updated.cash_balance).toBe(90);
      expect(updated.num_resolved_bets).toBe(1);
      expect(snapshots.getSnapshotsByAgent(agent!.id).map(snapshot => snapshot.snapshot_timestamp)).toEqual([
        '2025-01-01T00:00:00.000Z',
        '2025-01-02T00:00:00.000Z'
      ]);
      expect(snapshots.getSnapshotsByAgent(agent!.id, 1).map(snapshot => snapshot.snapshot_timestamp)).toEqual([
        '2025-01-02T00:00:00.000Z'
      ]);
      expect(snapshots.getLatestSnapshot(agent!.id)?.snapshot_timestamp).toBe('2025-01-02T00:00:00.000Z');
    });
  });
});
