/**
 * Shared TypeScript Type Definitions
 * 
 * This module defines all data types used throughout Forecaster Arena.
 * These types directly correspond to the SQLite database schema.
 * 
 * @module types
 */

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Cohort - A weekly competition instance
 * 
 * Each cohort starts on Sunday at 00:00 UTC with all 7 LLMs.
 * Cohorts run until all bets are resolved (no artificial time limit).
 */
export interface Cohort {
  id: string;
  cohort_number: number;
  started_at: string;
  status: 'active' | 'completed';
  completed_at: string | null;
  methodology_version: string;
  initial_balance: number;
  created_at: string;
}

/**
 * Model - An LLM configuration (reference table)
 * 
 * The 7 competing models are stored here. New models join from the next cohort.
 */
export interface Model {
  id: string;
  openrouter_id: string;
  display_name: string;
  provider: string;
  color: string | null;
  is_active: number; // SQLite boolean
  added_at: string;
}

/**
 * Agent - An LLM instance within a specific cohort
 * 
 * Each cohort has 7 agents (one per model). Agents track their own
 * balance, positions, and performance within that cohort.
 */
export interface Agent {
  id: string;
  cohort_id: string;
  model_id: string;
  cash_balance: number;
  total_invested: number;
  status: 'active' | 'bankrupt';
  created_at: string;
}

/**
 * Market - A Polymarket prediction market
 * 
 * Markets are synced from Polymarket's Gamma API.
 * Supports both binary (YES/NO) and multi-outcome markets.
 */
export interface Market {
  id: string;
  polymarket_id: string;
  question: string;
  description: string | null;
  category: string | null;
  market_type: 'binary' | 'multi_outcome';
  outcomes: string | null; // JSON array for multi-outcome
  close_date: string;
  status: 'active' | 'closed' | 'resolved' | 'cancelled';
  current_price: number | null;
  current_prices: string | null; // JSON for multi-outcome
  volume: number | null;
  liquidity: number | null;
  resolution_outcome: string | null;
  resolved_at: string | null;
  first_seen_at: string;
  last_updated_at: string;
}

/**
 * Position - An open holding in a market
 * 
 * Represents shares held by an agent in a specific market/side.
 * Updated with mark-to-market values daily.
 */
export interface Position {
  id: string;
  agent_id: string;
  market_id: string;
  side: string; // 'YES', 'NO', or outcome name
  shares: number;
  avg_entry_price: number;
  total_cost: number;
  current_value: number | null;
  unrealized_pnl: number | null;
  status: 'open' | 'closed' | 'settled';
  opened_at: string;
  closed_at: string | null;
}

/**
 * Trade - A buy or sell transaction
 * 
 * All transactions are recorded for audit trail and reproducibility.
 * For BUY trades: implied_confidence is set for Brier scoring
 * For SELL trades: cost_basis and realized_pnl are set for P/L tracking
 */
export interface Trade {
  id: string;
  agent_id: string;
  market_id: string;
  position_id: string | null;
  decision_id: string | null;
  trade_type: 'BUY' | 'SELL';
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  implied_confidence: number | null; // BUY only: for Brier score
  cost_basis: number | null;         // SELL only: cost basis of shares sold
  realized_pnl: number | null;       // SELL only: proceeds - cost_basis
  executed_at: string;
}

/**
 * Decision - Full LLM decision log
 * 
 * Stores the complete context (prompts, responses) for every decision.
 * Critical for reproducibility and analysis.
 */
export interface Decision {
  id: string;
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  decision_timestamp: string;
  prompt_system: string;
  prompt_user: string;
  raw_response: string | null;
  parsed_response: string | null; // JSON
  retry_count: number;
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  reasoning: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  api_cost_usd: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

/**
 * PortfolioSnapshot - Daily portfolio state
 * 
 * Captured daily for charting and historical analysis.
 */
export interface PortfolioSnapshot {
  id: string;
  agent_id: string;
  snapshot_date: string;
  cash_balance: number;
  positions_value: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  brier_score: number | null;
  num_resolved_bets: number;
  created_at: string;
}

/**
 * BrierScore - Individual bet scoring record
 */
export interface BrierScoreRecord {
  id: string;
  agent_id: string;
  trade_id: string;
  market_id: string;
  forecast_probability: number;
  actual_outcome: number; // 1 or 0
  brier_score: number;
  calculated_at: string;
}

/**
 * ApiCost - API usage tracking
 */
export interface ApiCost {
  id: string;
  model_id: string;
  decision_id: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  recorded_at: string;
}

/**
 * MethodologyVersion - Version tracking for the benchmark
 */
export interface MethodologyVersion {
  version: string;
  title: string;
  description: string;
  changes_summary: string | null;
  effective_from_cohort: number | null;
  document_hash: string | null;
  created_at: string;
}

/**
 * SystemLog - Audit trail
 */
export interface SystemLog {
  id: string;
  event_type: string;
  event_data: string | null; // JSON
  severity: 'info' | 'warning' | 'error';
  created_at: string;
}

// ============================================================================
// DERIVED TYPES (for frontend/API use)
// ============================================================================

/**
 * Agent with model details joined
 */
export interface AgentWithModel extends Agent {
  model: Model;
}

/**
 * Position with market details joined
 */
export interface PositionWithMarket extends Position {
  market_question: string;
  current_price: number;
}

/**
 * Leaderboard entry for aggregate rankings
 */
export interface LeaderboardEntry {
  model_id: string;
  display_name: string;
  provider: string;
  color: string;
  total_pnl: number;
  total_pnl_percent: number;
  avg_brier_score: number | null;
  num_cohorts: number;
  num_resolved_bets: number;
  win_rate: number | null;
}

/**
 * Cohort summary for listing
 */
export interface CohortSummary {
  id: string;
  cohort_number: number;
  started_at: string;
  status: 'active' | 'completed';
  num_agents: number;
  total_markets_traded: number;
  methodology_version: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Parsed decision from LLM response
 */
export interface ParsedDecision {
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  bets?: Array<{
    market_id: string;
    side: string;
    amount: number;
  }>;
  sells?: Array<{
    position_id: string;
    percentage: number;
  }>;
  reasoning: string;
  error?: string;
}

/**
 * OpenRouter API response structure
 */
export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

/**
 * Polymarket market from Gamma API
 */
export interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  end_date_iso: string;
  tokens: Array<{
    outcome: string;
    token_id: string;
    price: string;
    winner?: boolean;
  }>;
  closed: boolean;
  archived: boolean;
  active: boolean;
  category?: string;
  liquidity?: string;
  volume?: string;
  resolving?: boolean;
  resolved?: boolean;
}

