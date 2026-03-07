export function interpretBrierScore(score: number): string {
  if (score < 0.1) return 'Excellent';
  if (score < 0.2) return 'Good';
  if (score < 0.3) return 'Fair';
  if (score < 0.4) return 'Poor';
  return 'Very Poor';
}

export function formatBrierScore(score: number | null): string {
  if (score === null || score === undefined) return 'N/A';
  return score.toFixed(4);
}
