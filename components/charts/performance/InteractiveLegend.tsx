'use client';

import { BASELINE } from '@/components/charts/performance/constants';
import type { ModelConfig } from '@/components/charts/performance/types';

interface InteractiveLegendProps {
  models: ModelConfig[];
  latestValues: Record<string, number>;
  highlightedModel: string | null;
  onModelHover: (modelId: string | null) => void;
  onModelClick: (modelId: string) => void;
  isolatedModel: string | null;
  leaderId: string | null;
  showPercent: boolean;
}

export function InteractiveLegend({
  models,
  latestValues,
  highlightedModel,
  onModelHover,
  onModelClick,
  isolatedModel,
  leaderId,
  showPercent
}: InteractiveLegendProps) {
  const sortedModels = [...models].sort((left, right) => {
    const leftValue = latestValues[left.id] || BASELINE;
    const rightValue = latestValues[right.id] || BASELINE;
    return rightValue - leftValue;
  });

  return (
    <div className="flex flex-wrap justify-center gap-x-1 gap-y-2 mt-4 px-2">
      {sortedModels.map((model, index) => {
        const value = latestValues[model.id] || BASELINE;
        const pnl = value - BASELINE;
        const isLeader = model.id === leaderId;
        const isHighlighted = highlightedModel === model.id;
        const isIsolated = isolatedModel === model.id;
        const isFaded = isolatedModel !== null && !isIsolated;

        return (
          <button
            key={model.id}
            onMouseEnter={() => onModelHover(model.id)}
            onMouseLeave={() => onModelHover(null)}
            onClick={() => onModelClick(model.id)}
            className={`
              group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200
              ${isHighlighted ? 'bg-[var(--bg-elevated)] scale-105' : 'hover:bg-[var(--bg-tertiary)]'}
              ${isFaded ? 'opacity-30' : 'opacity-100'}
              ${isIsolated ? 'ring-1 ring-[var(--accent-gold)]/50' : ''}
            `}
          >
            <span className={`
              text-[10px] font-mono w-4 text-center
              ${isLeader ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)]'}
            `}>
              {index + 1}
            </span>

            <div className="relative">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-transform ${isHighlighted ? 'scale-125' : ''}`}
                style={{ backgroundColor: model.color }}
              />
              {isLeader && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-40"
                  style={{ backgroundColor: model.color }}
                />
              )}
            </div>

            <span className={`
              text-xs font-medium transition-colors
              ${isLeader
                ? 'text-[var(--accent-gold)]'
                : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}
            `}>
              {model.name}
            </span>

            <span className={`
              text-[10px] font-mono
              ${pnl >= 0 ? 'text-positive' : 'text-negative'}
            `}>
              {showPercent
                ? `${pnl >= 0 ? '+' : ''}${((pnl / BASELINE) * 100).toFixed(1)}%`
                : `${pnl >= 0 ? '+' : ''}${(pnl / 1000).toFixed(1)}k`
              }
            </span>
          </button>
        );
      })}
    </div>
  );
}
