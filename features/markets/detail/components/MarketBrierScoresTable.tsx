import { formatDecimal } from '@/lib/format/display';
import type { MarketBrierScore } from '@/features/markets/detail/types';

interface MarketBrierScoresTableProps {
  scores: MarketBrierScore[];
}

export function MarketBrierScoresTable({ scores }: MarketBrierScoresTableProps) {
  if (scores.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="heading-block mb-4">Brier Scores</h2>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Model</th>
              <th className="text-right">Forecast</th>
              <th className="text-right">Outcome</th>
              <th className="text-right">Brier Score</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => (
              <tr key={score.id}>
                <td className="text-[var(--text-muted)]">{index + 1}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: score.model_color }}
                    />
                    {score.model_display_name}
                  </div>
                </td>
                <td className="text-right font-mono">{(score.forecast_probability * 100).toFixed(1)}%</td>
                <td className="text-right">
                  <span className={score.actual_outcome === 1 ? 'text-positive' : 'text-negative'}>
                    {score.actual_outcome === 1 ? 'Correct' : 'Wrong'}
                  </span>
                </td>
                <td className="text-right font-mono">{formatDecimal(score.brier_score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
