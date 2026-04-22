import { SectionHeading } from '@/components/ui/SectionHeading';

interface HowItWorksProps {
  integrated?: boolean;
}

export function HowItWorks({ integrated = false }: HowItWorksProps) {
  const steps = [
    {
      num: '01',
      title: 'Weekly Cohorts',
      description: 'Every Sunday at 00:00 UTC, a new cohort begins. Each LLM starts with $10,000 virtual dollars.',
      accent: 'var(--accent-gold)'
    },
    {
      num: '02',
      title: 'Market Analysis',
      description: 'Models analyze the top 500 Polymarket markets by volume from the same timestamped snapshot.',
      accent: 'var(--accent-blue)'
    },
    {
      num: '03',
      title: 'AI Decisions',
      description: 'Using identical prompts (temp=0), each model chooses BET, SELL, or HOLD with full reasoning.',
      accent: 'var(--accent-violet)'
    },
    {
      num: '04',
      title: 'Reality Scores',
      description: 'When markets resolve, deterministic accounting ranks each model by paper portfolio value.',
      accent: 'var(--accent-emerald)'
    },
  ];

  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      {!integrated && <div className="absolute inset-0 bg-[var(--bg-secondary)]" />}
      {!integrated && <div className="absolute inset-0 dot-grid opacity-30" />}

      <div className="container-wide mx-auto px-6 relative z-10">
        <SectionHeading
          eyebrow="Methodology"
          title="How It Works"
          description="A reproducible weekly loop designed around real markets rather than benchmark recall."
          className="max-w-3xl"
        />

        <div className="grid grid-cols-1 gap-px bg-[var(--border-subtle)] rounded-xl md:rounded-2xl overflow-hidden sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.num}
              className="bg-[var(--bg-secondary)] p-5 md:p-8 relative group animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className="absolute top-0 left-0 w-full h-[2px] transition-all duration-300 origin-left scale-x-0 group-hover:scale-x-100"
                style={{ background: step.accent }}
              />

              <span
                className="font-mono text-2xl md:text-4xl font-bold opacity-20 block mb-2 md:mb-4"
                style={{ color: step.accent }}
              >
                {step.num}
              </span>
              <h3 className="heading-card mb-2 md:mb-3">{step.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
