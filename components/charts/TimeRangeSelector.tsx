'use client';

export type TimeRange = '10M' | '1H' | '1D' | '1W' | '1M' | '3M' | 'ALL';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
}

const ranges: { value: TimeRange; label: string }[] = [
  { value: '10M', label: '10M' },
  { value: '1H', label: '1H' },
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: 'ALL', label: 'ALL' },
];

export default function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-md transition-all
            ${selected === range.value
              ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }
          `}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
