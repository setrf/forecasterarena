'use client';

import { BASELINE } from '@/components/charts/performance/constants';
import {
  formatPerformanceCurrency,
  formatPerformanceDateTime,
  formatPerformancePercent,
  formatPerformanceSignedUsd
} from '@/components/charts/performance/formatters';
import type { ModelConfig } from '@/components/charts/performance/types';

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface PremiumTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  models: ModelConfig[];
  showPercent: boolean;
  previousData?: Record<string, number>;
}

export function PremiumTooltip({
  active,
  payload,
  label,
  models,
  showPercent,
  previousData
}: PremiumTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const sortedPayload = [...payload]
    .filter((entry) => typeof entry.value === 'number')
    .sort((a, b) => b.value - a.value);

  const previousRanks: Record<string, number> = {};
  if (previousData) {
    Object.entries(previousData)
      .filter(([, value]) => typeof value === 'number')
      .sort(([, left], [, right]) => right - left)
      .forEach(([modelId], index) => {
        previousRanks[modelId] = index + 1;
      });
  }

  return (
    <div className="bg-[#0a0a10]/95 backdrop-blur-xl border border-[var(--border-medium)] rounded-xl p-4 shadow-2xl min-w-[280px]">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
          {formatPerformanceDateTime(label || '')}
        </span>
        <span className="text-[10px] font-mono text-[var(--accent-gold)] uppercase tracking-widest">
          Live Rankings
        </span>
      </div>

      <div className="space-y-2">
        {sortedPayload.map((entry, index) => {
          const model = models.find((candidate) => candidate.id === entry.name);
          const pnl = entry.value - BASELINE;
          const rank = index + 1;
          const previousRank = previousRanks[entry.name];
          const rankChange = previousRank ? previousRank - rank : 0;

          return (
            <div
              key={entry.name}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                rank === 1 ? 'bg-[var(--accent-gold)]/10' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                  rank === 1
                    ? 'bg-[var(--accent-gold)] text-black'
                    : rank === 2
                      ? 'bg-[var(--text-muted)]/30 text-[var(--text-secondary)]'
                      : rank === 3
                        ? 'bg-[#cd7f32]/30 text-[#cd7f32]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                }`}
              >
                {rank}
              </div>

              <div
                className="w-2 h-8 rounded-full"
                style={{ backgroundColor: entry.color }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium truncate ${
                    rank === 1 ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'
                  }`}>
                    {model?.name || entry.name}
                  </span>
                  {model?.currentReleaseName && model.currentReleaseName !== model.name && (
                    <span className="rounded-full border border-[var(--border-medium)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                      {model.currentReleaseName}
                    </span>
                  )}
                  {rankChange !== 0 && (
                    <span className={`text-[10px] font-mono ${
                      rankChange > 0 ? 'text-positive' : 'text-negative'
                    }`}>
                      {rankChange > 0 ? `↑${rankChange}` : `↓${Math.abs(rankChange)}`}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {model?.name?.split(' ')[0] || 'Model'}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-sm font-medium">
                  {showPercent ? formatPerformancePercent(entry.value) : formatPerformanceCurrency(entry.value)}
                </div>
                <div className={`text-xs font-mono ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatPerformanceSignedUsd(pnl)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedPayload.length > 1 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Spread (1st - Last)</span>
            <span className="font-mono text-[var(--accent-gold)]">
              {formatPerformanceCurrency(sortedPayload[0].value - sortedPayload[sortedPayload.length - 1].value)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
