export const INDEXES_SQL = `
-- ============================================================================
-- INDEXES
-- ============================================================================
-- Performance indexes for common query patterns.

-- Agents
CREATE INDEX IF NOT EXISTS idx_agents_cohort ON agents(cohort_id);
CREATE INDEX IF NOT EXISTS idx_agents_model ON agents(model_id);
CREATE INDEX IF NOT EXISTS idx_agents_family ON agents(family_id);
CREATE INDEX IF NOT EXISTS idx_agents_release ON agents(release_id);
CREATE INDEX IF NOT EXISTS idx_agents_config_model ON agents(benchmark_config_model_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Positions
CREATE INDEX IF NOT EXISTS idx_positions_agent ON positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_agent_status ON positions(agent_id, status);

-- Trades
CREATE INDEX IF NOT EXISTS idx_trades_agent ON trades(agent_id);
CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_decision ON trades(decision_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed ON trades(executed_at DESC);

-- Decisions
CREATE INDEX IF NOT EXISTS idx_decisions_agent ON decisions(agent_id);
CREATE INDEX IF NOT EXISTS idx_decisions_cohort ON decisions(cohort_id);
CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON decisions(decision_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_family ON decisions(family_id);
CREATE INDEX IF NOT EXISTS idx_decisions_release ON decisions(release_id);
CREATE INDEX IF NOT EXISTS idx_decisions_config_model ON decisions(benchmark_config_model_id);

-- Portfolio Snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_agent ON portfolio_snapshots(agent_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON portfolio_snapshots(snapshot_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_agent_timestamp ON portfolio_snapshots(agent_id, snapshot_timestamp DESC);

-- Markets
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_polymarket ON markets(polymarket_id);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_volume ON markets(volume DESC);
CREATE INDEX IF NOT EXISTS idx_markets_close_date ON markets(close_date);
CREATE INDEX IF NOT EXISTS idx_markets_status_resolved ON markets(status, resolved_at DESC);

-- Additional composite indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_agents_status_balance ON agents(status, cash_balance DESC);
CREATE INDEX IF NOT EXISTS idx_positions_agent_market ON positions(agent_id, market_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cohorts_started_unique ON cohorts(started_at);

-- Brier Scores
CREATE INDEX IF NOT EXISTS idx_brier_agent ON brier_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_brier_market ON brier_scores(market_id);
CREATE INDEX IF NOT EXISTS idx_brier_trade ON brier_scores(trade_id);

-- API Costs
CREATE INDEX IF NOT EXISTS idx_api_costs_recorded ON api_costs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_costs_model ON api_costs(model_id);
CREATE INDEX IF NOT EXISTS idx_api_costs_agent ON api_costs(agent_id);
CREATE INDEX IF NOT EXISTS idx_api_costs_family ON api_costs(family_id);
CREATE INDEX IF NOT EXISTS idx_api_costs_release ON api_costs(release_id);
CREATE INDEX IF NOT EXISTS idx_api_costs_config_model ON api_costs(benchmark_config_model_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_costs_decision_unique
  ON api_costs(decision_id)
  WHERE decision_id IS NOT NULL;

-- Model Lineage
CREATE INDEX IF NOT EXISTS idx_model_families_status_order ON model_families(status, sort_order);
CREATE INDEX IF NOT EXISTS idx_model_releases_family_status ON model_releases(family_id, release_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_releases_openrouter ON model_releases(openrouter_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_configs_default ON benchmark_configs(is_default_for_future_cohorts, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_config_models_config_slot ON benchmark_config_models(benchmark_config_id, slot_order);
CREATE INDEX IF NOT EXISTS idx_benchmark_config_models_release ON benchmark_config_models(release_id);

-- Additional composite indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_trades_market_executed ON trades(market_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_agent_market_status ON positions(agent_id, market_id, status);
CREATE INDEX IF NOT EXISTS idx_decisions_agent_week ON decisions(agent_id, decision_week);

-- System Logs
CREATE INDEX IF NOT EXISTS idx_logs_type ON system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_logs_severity ON system_logs(severity);
CREATE INDEX IF NOT EXISTS idx_logs_created ON system_logs(created_at DESC);

-- Cohorts
CREATE INDEX IF NOT EXISTS idx_cohorts_status ON cohorts(status);
CREATE INDEX IF NOT EXISTS idx_cohorts_started ON cohorts(started_at DESC);
`;
