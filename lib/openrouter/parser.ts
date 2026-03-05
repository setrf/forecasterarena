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

type SupportedAction = 'BET' | 'SELL' | 'HOLD';

type Envelope = {
  action: SupportedAction;
  reasoning: string;
};

/**
 * Build a standard parser error response.
 */
function mkError(error: string, reasoning: string = ''): ParsedDecision {
  return {
    action: 'ERROR',
    reasoning,
    error
  };
}

/**
 * Remove markdown fences around a JSON payload.
 */
function stripCodeFences(input: string): string {
  let cleaned = input;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/i, '');
  }
  return cleaned;
}

/**
 * Remove outer quote wrapper when the whole response is wrapped.
 */
function stripOuterQuotes(input: string): string {
  if (
    (input.startsWith('"') && input.endsWith('"')) ||
    (input.startsWith("'") && input.endsWith("'"))
  ) {
    return input.slice(1, -1);
  }

  return input;
}

/**
 * Extract a JSON object containing an "action" field from prose-heavy output.
 */
function extractEmbeddedJsonWithAction(input: string): string {
  if (input.trim().startsWith('{')) {
    return input;
  }

  const jsonMatch = input.match(/\{[\s\S]*"action"\s*:\s*"[^"]+"/);
  if (!jsonMatch) {
    return input;
  }

  const startIdx = input.indexOf(jsonMatch[0]);
  let braceCount = 0;
  let endIdx = startIdx;

  for (let i = startIdx; i < input.length; i++) {
    if (input[i] === '{') braceCount++;
    if (input[i] === '}') braceCount--;
    if (braceCount === 0 && i > startIdx) {
      endIdx = i + 1;
      break;
    }
  }

  if (endIdx > startIdx) {
    return input.slice(startIdx, endIdx);
  }

  return input;
}

/**
 * Clean LLM response by removing markdown and extra whitespace
 *
 * @param rawResponse - Raw response from LLM
 * @returns Cleaned JSON string
 */
function cleanResponse(rawResponse: string): string {
  let cleaned = rawResponse.trim();
  cleaned = stripCodeFences(cleaned);
  cleaned = stripOuterQuotes(cleaned);
  cleaned = extractEmbeddedJsonWithAction(cleaned);
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

function validateEnvelope(parsed: any): Envelope | ParsedDecision {
  if (!parsed.action) {
    return mkError('Missing action field');
  }

  if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
    return mkError('Missing or invalid reasoning field');
  }

  const action = parsed.action.toUpperCase();
  if (!['BET', 'SELL', 'HOLD'].includes(action)) {
    return mkError(`Invalid action: ${parsed.action}`, parsed.reasoning);
  }

  return {
    action: action as SupportedAction,
    reasoning: parsed.reasoning
  };
}

function parseActionItems<TInput, TOutput>(args: {
  rawItems: unknown;
  emptyError: string;
  invalidPrefix: 'bet' | 'sell';
  reasoning: string;
  validate: (item: TInput) => string | null;
  mapItem: (item: TInput) => TOutput;
}): TOutput[] | ParsedDecision {
  if (!Array.isArray(args.rawItems) || args.rawItems.length === 0) {
    return mkError(args.emptyError, args.reasoning);
  }

  const parsedItems: TOutput[] = [];
  for (const rawItem of args.rawItems as TInput[]) {
    const error = args.validate(rawItem);
    if (error) {
      return mkError(`Invalid ${args.invalidPrefix}: ${error}`, args.reasoning);
    }

    parsedItems.push(args.mapItem(rawItem));
  }

  return parsedItems;
}

function isErrorDecision(value: unknown): value is ParsedDecision {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'action' in value &&
      (value as ParsedDecision).action === 'ERROR'
  );
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
    const cleaned = cleanResponse(rawResponse);
    const parsed = JSON.parse(cleaned);

    const envelope = validateEnvelope(parsed);
    if (isErrorDecision(envelope)) {
      return envelope;
    }

    if (envelope.action === 'BET') {
      const bets = parseActionItems<BetInstruction, BetInstruction>({
        rawItems: parsed.bets,
        emptyError: 'BET action requires non-empty bets array',
        invalidPrefix: 'bet',
        reasoning: envelope.reasoning,
        validate: (bet) => validateBet(bet, agentBalance),
        mapItem: (bet) => ({
          market_id: bet.market_id,
          side: bet.side,
          amount: bet.amount
        })
      });

      if (isErrorDecision(bets)) {
        return bets;
      }

      return {
        action: 'BET',
        bets,
        reasoning: envelope.reasoning
      };
    }

    if (envelope.action === 'SELL') {
      const sells = parseActionItems<SellInstruction, SellInstruction>({
        rawItems: parsed.sells,
        emptyError: 'SELL action requires non-empty sells array',
        invalidPrefix: 'sell',
        reasoning: envelope.reasoning,
        validate: validateSell,
        mapItem: (sell) => ({
          position_id: sell.position_id,
          percentage: sell.percentage
        })
      });

      if (isErrorDecision(sells)) {
        return sells;
      }

      return {
        action: 'SELL',
        sells,
        reasoning: envelope.reasoning
      };
    }

    return {
      action: 'HOLD',
      reasoning: envelope.reasoning
    };
  } catch (error) {
    return mkError(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`);
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
