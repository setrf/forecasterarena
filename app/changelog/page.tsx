'use client';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: string[];
  effectiveFromCohort: number;
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1',
    date: '2024-01-01',
    title: 'Initial Methodology',
    description: 'The first version of Forecaster Arena methodology, establishing the foundational framework for AI forecasting benchmarks.',
    changes: [
      'Weekly cohort system with 7 LLMs competing simultaneously',
      'Fixed $10,000 starting balance per agent',
      'Maximum bet size: 25% of current cash balance',
      'Minimum bet size: $50',
      'Temperature = 0 for all LLM calls (deterministic)',
      'Top 500 markets by volume presented each week',
      'Brier score + P/L dual scoring system',
      'Implied confidence derived from bet sizing',
      'Full prompt transparency and logging',
    ],
    effectiveFromCohort: 1
  }
];

export default function ChangelogPage() {
  return (
    <div className="container-wide mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-4">Changelog</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl">
          Version history of the Forecaster Arena methodology. Each version documents 
          changes to scoring, prompts, or competition structure for full transparency 
          and reproducibility.
        </p>
      </div>

      <div className="max-w-3xl">
        {/* Timeline */}
        <div className="relative border-l-2 border-[var(--border-medium)] pl-8 space-y-12">
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[41px] w-5 h-5 bg-[var(--accent-blue)] rounded-full border-4 border-[var(--bg-primary)]" />
              
              {/* Version badge */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-[var(--accent-blue)] text-white text-sm font-bold rounded-full">
                  {entry.version}
                </span>
                <span className="text-[var(--text-muted)]">
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                {i === 0 && (
                  <span className="badge badge-active">Current</span>
                )}
              </div>
              
              {/* Content */}
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-3">{entry.title}</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                  {entry.description}
                </p>
                
                {/* Changes list */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    Changes
                  </h3>
                  <ul className="space-y-2">
                    {entry.changes.map((change, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm">
                        <svg className="w-5 h-5 text-[var(--accent-emerald)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Effective from */}
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-sm text-[var(--text-muted)]">
                    Effective from Cohort #{entry.effectiveFromCohort}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming note */}
        <div className="mt-12 p-6 bg-[var(--bg-secondary)] border border-dashed border-[var(--border-medium)] rounded-lg text-center">
          <svg className="w-8 h-8 mx-auto mb-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[var(--text-secondary)]">
            Future methodology changes will be documented here with full version tracking.
            All changes go into effect at the start of a new cohort, never mid-cohort.
          </p>
        </div>
      </div>

      {/* Link to full methodology */}
      <div className="mt-12 text-center">
        <a href="/methodology" className="btn btn-primary">
          Read Full Methodology
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}



