export function calculateBrierScore(
  impliedConfidence: number,
  side: 'YES' | 'NO' | string,
  winningOutcome: 'YES' | 'NO' | string
): number {
  const normalizedSide = side.toUpperCase();
  const normalizedOutcome = winningOutcome.toUpperCase();
  const isBinary = normalizedSide === 'YES' || normalizedSide === 'NO';

  if (isBinary) {
    const forecastYes = normalizedSide === 'YES'
      ? impliedConfidence
      : (1 - impliedConfidence);
    const actualYes = normalizedOutcome === 'YES' ? 1 : 0;

    return Math.pow(forecastYes - actualYes, 2);
  }

  const didOutcomeWin = normalizedOutcome === normalizedSide ? 1 : 0;
  return Math.pow(impliedConfidence - didOutcomeWin, 2);
}

export function calculateAggregateBrier(brierScores: number[]): number {
  if (brierScores.length === 0) {
    return 0;
  }

  const sum = brierScores.reduce((acc, score) => acc + score, 0);
  return sum / brierScores.length;
}

export function calculateBrierSkillScore(
  brierScore: number,
  baseline: number = 0.25
): number {
  return 1 - (brierScore / baseline);
}
