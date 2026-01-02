/**
 * LLM Response Parser
 * 
 * Parses and validates LLM responses for decision-making.
 * Handles edge cases like markdown code blocks, extra whitespace, etc.
 * 
 * @module openrouter/parser
 */

import { MIN_BET } from '../constants';

/**
 * Bet instruction from LLM
 */
export interface BetInstruction {
  market_id: string;
  side: 'YES' | 'NO' | string;
  amount: number;
}

/**
 * Sell instruction from LLM
 */
export interface SellInstruction {
  position_id: string;
  percentage: number;  // 1-100
}

/**
 * Parsed decision from LLM response
 */
export interface ParsedDecision {
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  bets?: BetInstruction[];
  sells?: SellInstruction[];
  reasoning: string;
  error?: string;
}

/**
 * Clean LLM response by removing markdown and extra whitespace
 *
 * @param rawResponse - Raw response from LLM
 * @returns Cleaned JSON string
 */
function cleanResponse(rawResponse: string): string {
  let cleaned = rawResponse.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```')) {
    // Handle ```json or just ```
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/i, '');
  }

  // Remove any leading/trailing quotes that might wrap the whole thing
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }

  // If response doesn't start with '{', try to extract JSON from Markdown
  // This handles thinking models that output Markdown text with embedded JSON
  if (!cleaned.trim().startsWith('{')) {
    // Look for JSON object pattern in the text
    const jsonMatch = cleaned.match(/\{[\s\S]*"action"\s*:\s*"[^"]+"/);
    if (jsonMatch) {
      // Find the complete JSON object starting from the match
      const startIdx = cleaned.indexOf(jsonMatch[0]);
      let braceCount = 0;
      let endIdx = startIdx;

      for (let i = startIdx; i < cleaned.length; i++) {
        if (cleaned[i] === '{') braceCount++;
        if (cleaned[i] === '}') braceCount--;
        if (braceCount === 0 && i > startIdx) {
          endIdx = i + 1;
          break;
        }
      }

      if (endIdx > startIdx) {
        cleaned = cleaned.slice(startIdx, endIdx);
      }
    }
  }

  return cleaned.trim();
}

/**
 * Validate a bet instruction
 * 
 * @param bet - Bet instruction to validate
 * @param agentBalance - Agent's current cash balance
 * @param maxBetPercent - Maximum bet as percentage of balance
 * @returns Validation error or null if valid
 */
function validateBet(
  bet: BetInstruction,
  agentBalance: number,
  maxBetPercent: number = 0.25
): string | null {
  // Check required fields
  if (!bet.market_id) {
    return 'Missing market_id';
  }
  
  if (!bet.side) {
    return 'Missing side';
  }
  
  if (typeof bet.amount !== 'number' || isNaN(bet.amount)) {
    return 'Invalid amount';
  }
  
  // Side validation: allow any non-empty string
  // Binary markets use YES/NO, multi-outcome markets use outcome names (e.g., "Trump", "Biden")
  // The execution layer validates that the side matches an actual market outcome
  if (!bet.side.trim()) {
    return 'Side cannot be empty';
  }
  
  // Check amount constraints
  if (bet.amount < MIN_BET) {
    return `Bet amount $${bet.amount} is below minimum $${MIN_BET}`;
  }
  
  const maxBet = agentBalance * maxBetPercent;
  if (bet.amount > maxBet) {
    return `Bet amount $${bet.amount} exceeds maximum $${maxBet.toFixed(2)}`;
  }
  
  return null;
}

/**
 * Validate a sell instruction
 * 
 * @param sell - Sell instruction to validate
 * @returns Validation error or null if valid
 */
function validateSell(sell: SellInstruction): string | null {
  if (!sell.position_id) {
    return 'Missing position_id';
  }
  
  if (typeof sell.percentage !== 'number' || isNaN(sell.percentage)) {
    return 'Invalid percentage';
  }
  
  if (sell.percentage < 1 || sell.percentage > 100) {
    return `Percentage must be 1-100, got ${sell.percentage}`;
  }
  
  return null;
}

/**
 * Parse LLM response into a decision
 * 
 * @param rawResponse - Raw response from LLM
 * @param agentBalance - Agent's current cash balance (for validation)
 * @returns Parsed decision
 */
export function parseDecision(
  rawResponse: string,
  agentBalance: number = Infinity  // Default to no validation
): ParsedDecision {
  try {
    // Clean the response
    const cleaned = cleanResponse(rawResponse);
    
    // Try to parse as JSON
    const parsed = JSON.parse(cleaned);
    
    // Validate required fields
    if (!parsed.action) {
      return {
        action: 'ERROR',
        reasoning: '',
        error: 'Missing action field'
      };
    }
    
    if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
      return {
        action: 'ERROR',
        reasoning: '',
        error: 'Missing or invalid reasoning field'
      };
    }
    
    // Normalize action
    const action = parsed.action.toUpperCase();
    
    if (!['BET', 'SELL', 'HOLD'].includes(action)) {
      return {
        action: 'ERROR',
        reasoning: parsed.reasoning || '',
        error: `Invalid action: ${parsed.action}`
      };
    }
    
    // Handle BET action
    if (action === 'BET') {
      if (!Array.isArray(parsed.bets) || parsed.bets.length === 0) {
        return {
          action: 'ERROR',
          reasoning: parsed.reasoning,
          error: 'BET action requires non-empty bets array'
        };
      }
      
      // Validate each bet
      const bets: BetInstruction[] = [];
      for (const bet of parsed.bets) {
        const error = validateBet(bet, agentBalance);
        if (error) {
          return {
            action: 'ERROR',
            reasoning: parsed.reasoning,
            error: `Invalid bet: ${error}`
          };
        }
        bets.push({
          market_id: bet.market_id,
          side: bet.side,  // Preserve original case for multi-outcome markets
          amount: bet.amount
        });
      }
      
      return {
        action: 'BET',
        bets,
        reasoning: parsed.reasoning
      };
    }
    
    // Handle SELL action
    if (action === 'SELL') {
      if (!Array.isArray(parsed.sells) || parsed.sells.length === 0) {
        return {
          action: 'ERROR',
          reasoning: parsed.reasoning,
          error: 'SELL action requires non-empty sells array'
        };
      }
      
      // Validate each sell
      const sells: SellInstruction[] = [];
      for (const sell of parsed.sells) {
        const error = validateSell(sell);
        if (error) {
          return {
            action: 'ERROR',
            reasoning: parsed.reasoning,
            error: `Invalid sell: ${error}`
          };
        }
        sells.push({
          position_id: sell.position_id,
          percentage: sell.percentage
        });
      }
      
      return {
        action: 'SELL',
        sells,
        reasoning: parsed.reasoning
      };
    }
    
    // Handle HOLD action
    return {
      action: 'HOLD',
      reasoning: parsed.reasoning
    };
    
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return {
      action: 'ERROR',
      reasoning: '',
      error: `JSON parse error: ${error}`
    };
  }
}

/**
 * Check if a parsed decision is valid (not an error)
 * 
 * @param decision - Parsed decision
 * @returns True if valid
 */
export function isValidDecision(decision: ParsedDecision): boolean {
  return decision.action !== 'ERROR';
}

/**
 * Get a default HOLD decision (used for fallback)
 * 
 * @param reason - Reason for defaulting to HOLD
 * @returns HOLD decision
 */
export function getDefaultHoldDecision(reason: string): ParsedDecision {
  return {
    action: 'HOLD',
    reasoning: `[SYSTEM DEFAULT] ${reason}`
  };
}



