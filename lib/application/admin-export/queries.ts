import { getDb } from '@/lib/db';
import { DEFAULT_TABLES, type ExportTable } from '@/lib/application/admin-export/constants';
import type { ExportQueries } from '@/lib/application/admin-export/types';

export function buildQueries(includePrompts: boolean): ExportQueries {
  return {
    cohorts: {
      columns: ['id', 'cohort_number', 'started_at', 'status', 'completed_at', 'methodology_version', 'initial_balance', 'created_at'],
      sql: 'SELECT id, cohort_number, started_at, status, completed_at, methodology_version, initial_balance, created_at FROM cohorts WHERE id = ?'
    },
    agents: {
      columns: ['id', 'cohort_id', 'model_id', 'cash_balance', 'total_invested', 'status', 'created_at'],
      sql: 'SELECT id, cohort_id, model_id, cash_balance, total_invested, status, created_at FROM agents WHERE cohort_id = ?'
    },
    models: {
      columns: ['id', 'openrouter_id', 'display_name', 'provider', 'color', 'is_active', 'added_at'],
      sql: 'SELECT id, openrouter_id, display_name, provider, color, is_active, added_at FROM models WHERE id IN (SELECT DISTINCT model_id FROM agents WHERE cohort_id = ?)'
    },
    markets: {
      columns: ['id', 'polymarket_id', 'slug', 'event_slug', 'question', 'description', 'category', 'market_type', 'outcomes', 'close_date', 'status', 'current_price', 'current_prices', 'volume', 'liquidity', 'resolution_outcome', 'resolved_at', 'first_seen_at', 'last_updated_at'],
      sql: `SELECT DISTINCT m.id, m.polymarket_id, m.slug, m.event_slug, m.question, m.description, m.category, m.market_type, m.outcomes, m.close_date, m.status, m.current_price, m.current_prices, m.volume, m.liquidity, m.resolution_outcome, m.resolved_at, m.first_seen_at, m.last_updated_at
            FROM markets m
            WHERE m.id IN (
              SELECT DISTINCT p.market_id FROM positions p JOIN agents a ON p.agent_id = a.id WHERE a.cohort_id = ?
            )`
    },
    decisions: {
      columns: includePrompts
        ? ['id', 'agent_id', 'cohort_id', 'decision_week', 'decision_timestamp', 'prompt_system', 'prompt_user', 'raw_response', 'parsed_response', 'retry_count', 'action', 'reasoning', 'tokens_input', 'tokens_output', 'api_cost_usd', 'response_time_ms', 'error_message', 'created_at']
        : ['id', 'agent_id', 'cohort_id', 'decision_week', 'decision_timestamp', 'parsed_response', 'retry_count', 'action', 'reasoning', 'tokens_input', 'tokens_output', 'api_cost_usd', 'response_time_ms', 'error_message', 'created_at'],
      sql: `SELECT ${includePrompts
        ? 'id, agent_id, cohort_id, decision_week, decision_timestamp, prompt_system, prompt_user, raw_response, parsed_response, retry_count, action, reasoning, tokens_input, tokens_output, api_cost_usd, response_time_ms, error_message, created_at'
        : 'id, agent_id, cohort_id, decision_week, decision_timestamp, parsed_response, retry_count, action, reasoning, tokens_input, tokens_output, api_cost_usd, response_time_ms, error_message, created_at'}
            FROM decisions
            WHERE cohort_id = ?
              AND decision_timestamp >= ?
              AND decision_timestamp <= ?`
    },
    trades: {
      columns: ['id', 'agent_id', 'market_id', 'position_id', 'decision_id', 'trade_type', 'side', 'shares', 'price', 'total_amount', 'implied_confidence', 'cost_basis', 'realized_pnl', 'executed_at'],
      sql: `SELECT t.id, t.agent_id, t.market_id, t.position_id, t.decision_id, t.trade_type, t.side, t.shares, t.price, t.total_amount, t.implied_confidence, t.cost_basis, t.realized_pnl, t.executed_at
            FROM trades t
            JOIN agents a ON t.agent_id = a.id
            WHERE a.cohort_id = ?
              AND t.executed_at >= ?
              AND t.executed_at <= ?`
    },
    positions: {
      columns: ['id', 'agent_id', 'market_id', 'side', 'shares', 'avg_entry_price', 'total_cost', 'current_value', 'unrealized_pnl', 'status', 'opened_at', 'closed_at'],
      sql: `SELECT p.id, p.agent_id, p.market_id, p.side, p.shares, p.avg_entry_price, p.total_cost, p.current_value, p.unrealized_pnl, p.status, p.opened_at, p.closed_at
            FROM positions p
            JOIN agents a ON p.agent_id = a.id
            WHERE a.cohort_id = ?
              AND p.opened_at <= ?
              AND (p.closed_at IS NULL OR p.closed_at >= ?)`
    },
    portfolio_snapshots: {
      columns: ['id', 'agent_id', 'snapshot_timestamp', 'cash_balance', 'positions_value', 'total_value', 'total_pnl', 'total_pnl_percent', 'brier_score', 'num_resolved_bets', 'created_at'],
      sql: `SELECT s.id, s.agent_id, s.snapshot_timestamp, s.cash_balance, s.positions_value, s.total_value, s.total_pnl, s.total_pnl_percent, s.brier_score, s.num_resolved_bets, s.created_at
            FROM portfolio_snapshots s
            JOIN agents a ON s.agent_id = a.id
            WHERE a.cohort_id = ?
              AND s.snapshot_timestamp >= ?
              AND s.snapshot_timestamp <= ?`
    }
  };
}

export function getRequestedTables(input: unknown): ExportTable[] {
  const tables = Array.isArray(input) ? input : DEFAULT_TABLES;
  return tables.filter((table): table is ExportTable => {
    return typeof table === 'string' && DEFAULT_TABLES.includes(table as ExportTable);
  });
}

export function getRowsForTable(
  queries: ExportQueries,
  table: ExportTable,
  cohortId: string,
  isoFrom: string,
  isoTo: string
): Record<string, unknown>[] {
  const query = queries[table];
  const db = getDb();

  switch (table) {
    case 'cohorts':
    case 'agents':
    case 'models':
    case 'markets':
      return db.prepare(query.sql).all(cohortId) as Record<string, unknown>[];
    case 'decisions':
    case 'trades':
    case 'portfolio_snapshots':
      return db.prepare(query.sql).all(cohortId, isoFrom, isoTo) as Record<string, unknown>[];
    case 'positions':
      return db.prepare(query.sql).all(cohortId, isoTo, isoFrom) as Record<string, unknown>[];
  }
}
