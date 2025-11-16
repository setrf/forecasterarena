/**
 * Shared TypeScript Type Definitions
 *
 * This module defines all data types used throughout the application.
 * These types match the database schema and are used by both SQLite
 * and Supabase implementations.
 *
 * Benefits of shared types:
 * - Type safety across the entire application
 * - Single source of truth for data structures
 * - Easy to switch between SQLite and Supabase
 * - Auto-completion in IDE
 */

/**
 * Agent Type
 *
 * Represents an AI model competing in prediction markets.
 * Each agent has a unique model (GPT-4, Claude, etc.) and maintains
 * its own balance and betting history.
 */
export type Agent = {
  id: string;                                      // Unique identifier
  season_id: string;                               // Which season this agent belongs to
  model_id: string;                                // OpenRouter model ID (e.g., 'openai/gpt-4')
  display_name: string;                            // Human-readable name (e.g., 'GPT-4')
  balance: number;                                 // Current available funds in dollars
  total_pl: number;                                // Total realized profit/loss since season start
  total_bets: number;                              // Total number of bets placed
  winning_bets: number;                            // Number of winning bets
  losing_bets: number;                             // Number of losing bets
  pending_bets: number;                            // Number of active bets not yet resolved
  status: 'active' | 'paused' | 'eliminated';      // Agent status
  created_at: string;                              // ISO 8601 timestamp
  updated_at: string;                              // ISO 8601 timestamp
  mtm_pl?: number;                                 // Mark-to-market unrealized P/L (computed field)
  total_pl_with_mtm?: number;                      // Total P/L including unrealized (computed field)
};

/**
 * Market Type
 *
 * Represents a prediction market where agents can place bets.
 * Markets can be from Polymarket or custom-created.
 */
export type Market = {
  id: string;                                      // Unique identifier
  polymarket_id: string | null;                    // Polymarket market ID (null for custom markets)
  question: string;                                // Market question (e.g., "Will Bitcoin hit $100k?")
  description: string | null;                      // Detailed description
  category: string | null;                         // Category (e.g., 'crypto', 'politics', 'sports')
  close_date: string;                              // When betting closes (ISO 8601 timestamp)
  status: 'active' | 'closed' | 'resolved' | 'cancelled';  // Market status
  current_price: number | null;                    // Current YES price (0.0 to 1.0, e.g., 0.65 = 65%)
  winning_outcome: string | null;                  // 'YES' or 'NO' after market resolves
  volume: number | null;                           // Total trading volume in dollars
};

/**
 * Bet Type
 *
 * Represents a single bet placed by an agent on a market.
 * Tracks all bet details including reasoning and resolution.
 */
export type Bet = {
  id: string;                                      // Unique identifier
  agent_id: string;                                // Which agent placed this bet
  market_id: string;                               // Which market this bet is on
  side: 'YES' | 'NO';                              // Which outcome the agent bet on
  amount: number;                                  // Bet amount in dollars
  price: number;                                   // Price at time of bet (0.0 to 1.0)
  confidence: number | null;                       // AI confidence score (0.0 to 1.0)
  reasoning: string | null;                        // AI's reasoning for this bet
  status: 'pending' | 'won' | 'lost' | 'cancelled' | 'refunded';  // Bet status
  pnl: number | null;                              // Profit/loss after resolution
  placed_at: string;                               // When bet was placed (ISO 8601 timestamp)
  resolved_at: string | null;                      // When bet was resolved (ISO 8601 timestamp)
};

/**
 * Equity Snapshot Type
 *
 * Represents a point-in-time snapshot of an agent's performance.
 * Used to build equity curve charts showing performance over time.
 */
export type EquitySnapshot = {
  id: string;                                      // Unique identifier
  agent_id: string;                                // Which agent this snapshot belongs to
  balance: number;                                 // Agent's balance at this point in time
  total_pl: number;                                // Agent's total P/L at this point in time
  timestamp: string;                               // When this snapshot was taken (ISO 8601 timestamp)
};
