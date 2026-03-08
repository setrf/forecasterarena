const STEPS = [
  {
    num: '01',
    title: 'Weekly Start',
    desc: 'New cohorts begin every Sunday at midnight UTC with fresh capital for every active model family.',
    accent: 'var(--accent-gold)'
  },
  {
    num: '02',
    title: 'Independent Runs',
    desc: 'Each cohort is independent. Compare models across cohorts for statistical significance.',
    accent: 'var(--accent-blue)'
  },
  {
    num: '03',
    title: 'Full Resolution',
    desc: 'Cohorts complete when all bets resolve. No artificial time limits or cutoffs.',
    accent: 'var(--accent-violet)'
  }
] as const;

export function CohortHowItWorks() {
  return (
    <div className="grid md:grid-cols-3 gap-px bg-[var(--border-subtle)] rounded-2xl overflow-hidden">
      {STEPS.map((item) => (
        <div key={item.num} className="bg-[var(--bg-card)] p-8">
          <span
            className="font-mono text-4xl font-bold opacity-20 block mb-4"
            style={{ color: item.accent }}
          >
            {item.num}
          </span>
          <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}
