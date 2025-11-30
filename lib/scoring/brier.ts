/**
 * Brier Score Calculation
 * 
 * The Brier Score measures the accuracy of probabilistic predictions.
 * Lower is better: 0 = perfect, 1 = worst possible.
 * 
 * Formula: Brier = (forecast - outcome)²
 * 
 * @module scoring/brier
 */

import { MAX_BET_PERCENT, INITIAL_BALANCE } from '../constants';

/**
 * Calculate implied confidence from bet size
 * 
 * Confidence is derived from how much of the maximum possible bet was used.
 * 
 * @param betAmount - Amount bet in dollars
 * @param cashBalanceAtBet - Cash balance when bet was placed
 * @returns Implied confidence (0 to 1)
 */
export function calculateImpliedConfidence(
  betAmount: number,
  cashBalanceAtBet: number
): number {
  const maxBet = cashBalanceAtBet * MAX_BET_PERCENT;
  
  if (maxBet <= 0) return 0;
  
  return Math.min(betAmount / maxBet, 1.0);
}

/**
 * Calculate Brier score for a single prediction
 * 
 * For YES bets:
 *   - If YES wins (outcome=1): Brier = (confidence - 1)²
 *   - If NO wins (outcome=0): Brier = (confidence - 0)² = confidence²
 * 
 * For NO bets:
 *   - We invert the confidence to express it as a YES probability
 *   - confidence_YES = 1 - confidence_NO
 * 
 * @param impliedConfidence - Implied confidence from bet size (0 to 1)
 * @param side - 'YES' or 'NO' (what was bet on)
 * @param winningOutcome - 'YES' or 'NO' (what actually won)
 * @returns Brier score (0 to 1)
 */
export function calculateBrierScore(
  impliedConfidence: number,
  side: 'YES' | 'NO' | string,
  winningOutcome: 'YES' | 'NO' | string
): number {
  // Normalize to uppercase
  const normalizedSide = side.toUpperCase();
  const normalizedOutcome = winningOutcome.toUpperCase();
  
  // For binary markets, convert confidence to YES-equivalent
  let forecastYes: number;
  
  if (normalizedSide === 'YES') {
    // YES bet: confidence IS the YES probability
    forecastYes = impliedConfidence;
  } else if (normalizedSide === 'NO') {
    // NO bet: confidence in NO means low confidence in YES
    forecastYes = 1 - impliedConfidence;
  } else {
    // Multi-outcome: treat as binary for now
    forecastYes = impliedConfidence;
  }
  
  // Actual outcome as 0 or 1
  const actualYes = normalizedOutcome === 'YES' ? 1 : 
                    normalizedOutcome === normalizedSide ? 1 : 0;
  
  // Brier score formula
  return Math.pow(forecastYes - actualYes, 2);
}

/**
 * Calculate aggregate Brier score from multiple scores
 * 
 * @param brierScores - Array of individual Brier scores
 * @returns Mean Brier score
 */
export function calculateAggregateBrier(brierScores: number[]): number {
  if (brierScores.length === 0) return 0;
  
  const sum = brierScores.reduce((acc, score) => acc + score, 0);
  return sum / brierScores.length;
}

/**
 * Interpret a Brier score
 * 
 * @param score - Brier score (0 to 1)
 * @returns Human-readable interpretation
 */
export function interpretBrierScore(score: number): string {
  if (score < 0.1) return 'Excellent';
  if (score < 0.2) return 'Good';
  if (score < 0.3) return 'Fair';
  if (score < 0.4) return 'Poor';
  return 'Very Poor';
}

/**
 * Calculate Brier skill score (relative to baseline)
 * 
 * A random guesser on binary outcomes has Brier = 0.25.
 * Skill score = 1 - (brier / baseline)
 * 
 * @param brierScore - Actual Brier score
 * @param baseline - Baseline score (default: 0.25 for random binary)
 * @returns Skill score (-∞ to 1, higher is better)
 */
export function calculateBrierSkillScore(
  brierScore: number,
  baseline: number = 0.25
): number {
  return 1 - (brierScore / baseline);
}

/**
 * Format Brier score for display
 * 
 * @param score - Brier score
 * @returns Formatted string
 */
export function formatBrierScore(score: number | null): string {
  if (score === null || score === undefined) return 'N/A';
  return score.toFixed(4);
}


