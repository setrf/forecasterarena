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
 * 
 * Note: API returns outcomes and prices as JSON strings
 */
export interface PolymarketMarket {
  id: string;                    // Condition ID (market identifier)
  question: string;              // Market question
  description?: string;          // Detailed description
  end_date_iso?: string;         // When market closes (snake_case)
  endDateIso?: string;           // When market closes (camelCase)
  endDate?: string;              // When market closes (alternative)
  tokens?: PolymarketToken[];    // Outcome tokens (legacy format)
  outcomes?: string | string[];  // Outcomes as JSON string '["Yes", "No"]' or array
  outcomePrices?: string | string[]; // Prices as JSON string '["0.42", "0.58"]' or array
  closed: boolean;               // Whether market is closed
  archived: boolean;             // Whether market is archived
  active: boolean;               // Whether market is active for trading
  category?: string;             // Category (Politics, Crypto, etc.)
  liquidity?: string | number;   // Current liquidity
  volume?: string | number;      // Total trading volume (string format)
  volumeNum?: number;            // Total trading volume (numeric format)
  resolving?: boolean;           // Whether market is in resolution process
  resolved?: boolean;            // Whether market is fully resolved
  conditionId?: string;          // Alternative ID field
  slug?: string;                 // URL slug
  image?: string;                // Market image URL
  negRisk?: boolean;             // Whether this is a negative risk market
  negRiskMarketID?: string;      // Parent negative risk market ID
  clobTokenIds?: string;         // CLOB token IDs (JSON string)
  groupItemTitle?: string;       // Title of item in a group (e.g., "Bad Bunny")
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
 * Event from Polymarket Gamma API
 * Events are containers for related markets (e.g., "Top Spotify Artist 2025")
 * 
 * @see https://docs.polymarket.com/developers/gamma-markets-api/gamma-structure
 */
export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  description?: string;
  volume?: number;
  liquidity?: number;
  markets: PolymarketMarket[];   // Sub-markets within this event
  closed?: boolean;
  active?: boolean;
  category?: string;
  image?: string;
}

/**
 * API response for markets list
 */
export interface MarketsResponse {
  markets: PolymarketMarket[];
  next_cursor?: string;
}


