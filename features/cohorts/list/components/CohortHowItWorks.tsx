const STEPS = [
  {
    num: '01',
    title: 'Weekly Start',
    desc: 'New cohorts begin every Sunday at midnight UTC with fresh capital for every active model family.',
    accent: 'var(--accent-gold)'
  },
  {
    num: '02',
    title: 'Latest Decision Window',
    desc: 'Only the latest eligible cohort numbers receive new model decisions; older active cohorts keep resolving.',
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
          <h3 className="heading-card mb-2">{item.title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}
