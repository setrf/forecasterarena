import { ReferenceLine } from 'recharts';
import { BASELINE } from '@/components/charts/performance/constants';

interface PerformanceReferenceLinesProps {
  showPercent: boolean;
  sundayMarkers: string[];
  releaseMarkerDates: string[];
}

export function PerformanceReferenceLines({
  showPercent,
  sundayMarkers,
  releaseMarkerDates
}: PerformanceReferenceLinesProps) {
  return (
    <>
      <ReferenceLine
        y={BASELINE}
        stroke="var(--text-muted)"
        strokeDasharray="4 4"
        strokeWidth={1}
        label={{
          value: showPercent ? '0% (Break Even)' : '$10,000',
          position: 'left',
          fill: 'var(--text-muted)',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace'
        }}
      />

      {sundayMarkers.slice(0, 8).map((dateStr, index) => (
        <ReferenceLine
          key={dateStr}
          x={dateStr}
          stroke="var(--accent-gold)"
          strokeDasharray="2 4"
          strokeWidth={1}
          opacity={0.3}
          label={index === 0 ? {
            value: '↓ Decision Days',
            position: 'insideTop',
            fill: 'var(--accent-gold)',
            fontSize: 9,
            fontFamily: 'JetBrains Mono, monospace',
            opacity: 0.6,
            offset: 15
          } : undefined}
        />
      ))}

      {releaseMarkerDates.map((dateStr) => (
        <ReferenceLine
          key={`release-${dateStr}`}
          x={dateStr}
          stroke="var(--accent-blue)"
          strokeDasharray="6 6"
          strokeWidth={1}
          opacity={0.22}
        />
      ))}
    </>
  );
}
