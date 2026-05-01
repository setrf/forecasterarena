import { getDb } from '@/lib/db';
import { ALL_EXPORT_TABLES, DEFAULT_TABLES, type ExportTable } from '@/lib/application/admin-export/constants';
import type { ExportQueries } from '@/lib/application/admin-export/types';

export function buildQueries(includePrompts: boolean): ExportQueries {
  return {
    cohorts: {
      columns: ['id', 'cohort_number', 'started_at', 'status', 'completed_at', 'methodology_version', 'benchmark_config_id', 'is_archived', 'archived_at', 'archive_reason', 'initial_balance', 'created_at'],
      sql: 'SELECT id, cohort_number, started_at, status, completed_at, methodology_version, benchmark_config_id, is_archived, archived_at, archive_reason, initial_balance, created_at FROM cohorts WHERE id = ?'
    },
    agents: {
      columns: ['id', 'cohort_id', 'model_id', 'family_id', 'release_id', 'benchmark_config_model_id', 'cash_balance', 'total_invested', 'status', 'created_at'],
      sql: 'SELECT id, cohort_id, model_id, family_id, release_id, benchmark_config_model_id, cash_balance, total_invested, status, created_at FROM agents WHERE cohort_id = ?'
    },
    model_families: {
      columns: ['id', 'slug', 'legacy_model_id', 'provider', 'family_name', 'public_display_name', 'short_display_name', 'color', 'status', 'sort_order', 'created_at', 'retired_at'],
      sql: `SELECT DISTINCT mf.id, mf.slug, mf.legacy_model_id, mf.provider, mf.family_name, mf.public_display_name, mf.short_display_name, mf.color, mf.status, mf.sort_order, mf.created_at, mf.retired_at
            FROM model_families mf
            JOIN agents a ON a.family_id = mf.id
            WHERE a.cohort_id = ?`
    },
    model_releases: {
      columns: ['id', 'family_id', 'release_name', 'release_slug', 'openrouter_id', 'provider', 'metadata_json', 'release_status', 'created_at', 'retired_at', 'first_used_cohort_number', 'last_used_cohort_number'],
      sql: `SELECT DISTINCT mr.id, mr.family_id, mr.release_name, mr.release_slug, mr.openrouter_id, mr.provider, mr.metadata_json, mr.release_status, mr.created_at, mr.retired_at, mr.first_used_cohort_number, mr.last_used_cohort_number
            FROM model_releases mr
            JOIN agents a ON a.release_id = mr.id
            WHERE a.cohort_id = ?`
    },
    benchmark_configs: {
      columns: ['id', 'version_name', 'methodology_version', 'notes', 'created_by', 'is_default_for_future_cohorts', 'created_at'],
      sql: `SELECT bc.id, bc.version_name, bc.methodology_version, bc.notes, bc.created_by, bc.is_default_for_future_cohorts, bc.created_at
            FROM benchmark_configs bc
            JOIN cohorts c ON c.benchmark_config_id = bc.id
            WHERE c.id = ?`
    },
    benchmark_config_models: {
      columns: ['id', 'benchmark_config_id', 'family_id', 'release_id', 'slot_order', 'family_display_name_snapshot', 'short_display_name_snapshot', 'release_display_name_snapshot', 'provider_snapshot', 'color_snapshot', 'openrouter_id_snapshot', 'input_price_per_million_snapshot', 'output_price_per_million_snapshot', 'created_at'],
      sql: `SELECT bcm.id, bcm.benchmark_config_id, bcm.family_id, bcm.release_id, bcm.slot_order, bcm.family_display_name_snapshot, bcm.short_display_name_snapshot, bcm.release_display_name_snapshot, bcm.provider_snapshot, bcm.color_snapshot, bcm.openrouter_id_snapshot, bcm.input_price_per_million_snapshot, bcm.output_price_per_million_snapshot, bcm.created_at
            FROM benchmark_config_models bcm
            JOIN cohorts c ON c.benchmark_config_id = bcm.benchmark_config_id
            WHERE c.id = ?`
    },
    agent_benchmark_identity: {
      columns: [
        'agent_id',
        'cohort_id',
        'legacy_model_id',
        'family_id',
        'family_slug',
        'family_display_name',
        'short_display_name',
        'release_id',
        'release_slug',
        'release_display_name',
        'provider',
        'color',
        'openrouter_id',
        'input_price_per_million',
        'output_price_per_million',
        'benchmark_config_model_id'
      ],
      sql: `SELECT agent_id, cohort_id, legacy_model_id, family_id, family_slug, family_display_name, short_display_name, release_id, release_slug, release_display_name, provider, color, openrouter_id, input_price_per_million, output_price_per_million, benchmark_config_model_id
            FROM agent_benchmark_identity_v
            WHERE cohort_id = ?`
    },
    api_costs: {
      columns: ['id', 'model_id', 'agent_id', 'family_id', 'release_id', 'benchmark_config_model_id', 'decision_id', 'tokens_input', 'tokens_output', 'cost_usd', 'recorded_at'],
      sql: `SELECT ac.id, ac.model_id, ac.agent_id, ac.family_id, ac.release_id, ac.benchmark_config_model_id, ac.decision_id, ac.tokens_input, ac.tokens_output, ac.cost_usd, ac.recorded_at
            FROM api_costs ac
            JOIN agents a ON ac.agent_id = a.id
            WHERE a.cohort_id = ?
              AND ac.recorded_at >= ?
              AND ac.recorded_at <= ?`
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
        ? ['id', 'agent_id', 'cohort_id', 'family_id', 'release_id', 'benchmark_config_model_id', 'decision_week', 'decision_timestamp', 'prompt_system', 'prompt_user', 'raw_response', 'parsed_response', 'retry_count', 'action', 'reasoning', 'tokens_input', 'tokens_output', 'api_cost_usd', 'response_time_ms', 'error_message', 'created_at']
        : ['id', 'agent_id', 'cohort_id', 'family_id', 'release_id', 'benchmark_config_model_id', 'decision_week', 'decision_timestamp', 'parsed_response', 'retry_count', 'action', 'reasoning', 'tokens_input', 'tokens_output', 'api_cost_usd', 'response_time_ms', 'error_message', 'created_at'],
      sql: `SELECT ${includePrompts
        ? 'id, agent_id, cohort_id, family_id, release_id, benchmark_config_model_id, decision_week, decision_timestamp, prompt_system, prompt_user, raw_response, parsed_response, retry_count, action, reasoning, tokens_input, tokens_output, api_cost_usd, response_time_ms, error_message, created_at'
        : 'id, agent_id, cohort_id, family_id, release_id, benchmark_config_model_id, decision_week, decision_timestamp, parsed_response, retry_count, action, reasoning, tokens_input, tokens_output, api_cost_usd, response_time_ms, error_message, created_at'}
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
    return typeof table === 'string' && ALL_EXPORT_TABLES.includes(table as ExportTable);
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
    case 'model_families':
    case 'model_releases':
    case 'benchmark_configs':
    case 'benchmark_config_models':
    case 'agent_benchmark_identity':
    case 'markets':
      return db.prepare(query.sql).all(cohortId) as Record<string, unknown>[];
    case 'api_costs':
    case 'decisions':
    case 'trades':
    case 'portfolio_snapshots':
      return db.prepare(query.sql).all(cohortId, isoFrom, isoTo) as Record<string, unknown>[];
    case 'positions':
      return db.prepare(query.sql).all(cohortId, isoTo, isoFrom) as Record<string, unknown>[];
  }
}
