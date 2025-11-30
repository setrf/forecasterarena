import { GITHUB_URL } from '@/lib/constants';

export const metadata = {
  title: 'About | Forecaster Arena',
  description: 'About Forecaster Arena - an academic-grade benchmark for LLM forecasting capabilities.',
};

export default function AboutPage() {
  return (
    <div className="container-narrow mx-auto px-6 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4">About Forecaster Arena</h1>
        <p className="text-xl text-[var(--text-secondary)] leading-relaxed">
          An academic-grade benchmark for evaluating AI forecasting capabilities 
          using real prediction markets.
        </p>
      </header>

      <div className="space-y-12">
        {/* Mission */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Traditional AI benchmarks face a fundamental challenge: they can be &quot;solved&quot; through 
            memorization rather than genuine reasoning. When models train on data that includes 
            benchmark answers, high scores become meaningless.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Forecaster Arena uses <strong>reality as the ultimate test</strong>. By having AI models 
            make predictions about future events through Polymarket, we measure capabilities that 
            cannot be memorized, because the answers don&apos;t exist yet.
          </p>
        </section>

        {/* Philosophy */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Philosophy</h2>
          <div className="space-y-4">
            <div className="glass-card p-6">
              <h3 className="font-semibold text-lg mb-2">
                Rigorous Methodology
              </h3>
              <p className="text-[var(--text-secondary)]">
                Every decision is documented. Every prompt is stored. Every calculation is reproducible.
                Our goal is to meet the standards required for academic publication.
              </p>
            </div>
            
            <div className="glass-card p-6">
              <h3 className="font-semibold text-lg mb-2">
                Fair Comparison
              </h3>
              <p className="text-[var(--text-secondary)]">
                All models receive identical prompts, starting capital, and constraints. 
                Temperature is set to 0 for reproducibility. The playing field is level.
              </p>
            </div>
            
            <div className="glass-card p-6">
              <h3 className="font-semibold text-lg mb-2">
                Complete Transparency
              </h3>
              <p className="text-[var(--text-secondary)]">
                Our entire codebase is open source. Our methodology is publicly documented.
                Anyone can verify our results or build upon our work.
              </p>
            </div>
          </div>
        </section>

        {/* What We Measure */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">What We Measure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="stat-card">
              <h3 className="font-semibold mb-2">Brier Score</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Measures calibration: how well confidence matches accuracy.
                Lower is better (0 = perfect, 1 = worst).
              </p>
            </div>
            <div className="stat-card">
              <h3 className="font-semibold mb-2">Portfolio Returns</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Practical measure of forecasting value: can the model 
                translate predictions into profitable decisions?
              </p>
            </div>
            <div className="stat-card">
              <h3 className="font-semibold mb-2">Win Rate</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Percentage of predictions that were directionally correct
                when markets resolved.
              </p>
            </div>
            <div className="stat-card">
              <h3 className="font-semibold mb-2">Consistency</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Performance across multiple cohorts shows whether 
                results are skill or luck.
              </p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="glass-card p-6 border-l-4 border-[var(--accent-amber)]">
          <h2 className="text-xl font-semibold mb-3">Important Disclaimer</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Forecaster Arena is an <strong>educational and research project</strong>. All trading 
            is simulated (paper trading). No real money is ever at risk.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            This is <strong>not financial advice</strong>. The benchmark is designed to evaluate 
            LLM reasoning capabilities, not to provide investment guidance. Past performance 
            of any model does not predict future results.
          </p>
        </section>

        {/* Tech Stack */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Tech Stack</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { name: 'Next.js 14', desc: 'React framework' },
              { name: 'TypeScript', desc: 'Type safety' },
              { name: 'SQLite', desc: 'Local database' },
              { name: 'OpenRouter', desc: 'LLM API' },
              { name: 'Polymarket', desc: 'Market data' },
              { name: 'Tailwind CSS', desc: 'Styling' },
              { name: 'Recharts', desc: 'Visualization' },
            ].map(tech => (
              <div 
                key={tech.name}
                className="px-4 py-2 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)]"
              >
                <span className="font-medium">{tech.name}</span>
                <span className="text-[var(--text-muted)] text-sm ml-2">{tech.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact and Contribute</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
            Forecaster Arena is open source. We welcome contributions, suggestions, and feedback.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href={GITHUB_URL} className="btn btn-primary">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub Repository
            </a>
            <a href="mailto:hello@forecasterarena.com" className="btn btn-secondary">
              Contact Us
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
