/**
 * Polymarket API Types
 * 
 * Type definitions for Polymarket's Gamma API responses.
 * 
 * @module polymarket/types
 */

/**
 * Token (outcome) in a market
 */
export interface PolymarketToken {
  outcome: string;        // 'Yes', 'No', or custom outcome name
  token_id: string;       // Unique token identifier
  price: string;          // Current price as string (0-1)
  winner?: boolean;       // Set when market is resolved
}

/**
 * Market from Polymarket Gamma API
 */
export interface PolymarketMarket {
  id: string;                    // Condition ID (market identifier)
  question: string;              // Market question
  description?: string;          // Detailed description
  end_date_iso: string;          // When market closes for betting
  tokens: PolymarketToken[];     // Outcome tokens (usually 2 for binary)
  closed: boolean;               // Whether market is closed
  archived: boolean;             // Whether market is archived
  active: boolean;               // Whether market is active for trading
  category?: string;             // Category (Politics, Crypto, etc.)
  liquidity?: string;            // Current liquidity
  volume?: string;               // Total trading volume
  resolving?: boolean;           // Whether market is in resolution process
  resolved?: boolean;            // Whether market is fully resolved
  conditionId?: string;          // Alternative ID field
  slug?: string;                 // URL slug
  image?: string;                // Market image URL
}

/**
 * Simplified market for our database
 */
export interface SimplifiedMarket {
  polymarket_id: string;
  question: string;
  description: string | null;
  category: string | null;
  market_type: 'binary' | 'multi_outcome';
  outcomes: string | null;       // JSON array for multi-outcome
  close_date: string;
  status: 'active' | 'closed' | 'resolved';
  current_price: number | null;  // YES price for binary
  current_prices: string | null; // JSON for multi-outcome
  volume: number | null;
  liquidity: number | null;
}

/**
 * Market resolution result
 */
export interface MarketResolution {
  resolved: boolean;
  winner?: string;               // 'YES', 'NO', or outcome name
}

/**
 * API response for markets list
 */
export interface MarketsResponse {
  markets: PolymarketMarket[];
  next_cursor?: string;
}


