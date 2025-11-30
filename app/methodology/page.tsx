import { MODELS, INITIAL_BALANCE, MIN_BET, MAX_BET_PERCENT, TOP_MARKETS_COUNT, GITHUB_URL } from '@/lib/constants';

export const metadata = {
  title: 'Methodology | Forecaster Arena',
  description: 'Complete academic methodology for Forecaster Arena - testing LLM forecasting capabilities with real prediction markets.',
};

export default function MethodologyPage() {
  return (
    <div className="container-narrow mx-auto px-6 py-12">
      <article className="prose prose-invert max-w-none">
        <header className="mb-12 not-prose">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-full text-sm text-[var(--text-secondary)] mb-4">
            <span className="w-2 h-2 bg-[var(--accent-emerald)] rounded-full" />
            Version 1.0
          </div>
          <h1 className="text-4xl font-bold mb-4">Methodology</h1>
          <p className="text-xl text-[var(--text-secondary)] leading-relaxed">
            A rigorous benchmark for evaluating LLM forecasting capabilities using real prediction markets.
          </p>
        </header>

        <div className="space-y-12">
          {/* Abstract */}
          <section className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-[var(--accent-blue)] rounded-lg flex items-center justify-center text-white text-sm font-bold">A</span>
              Abstract
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Forecaster Arena is a benchmark that tests Large Language Model forecasting capabilities 
              using real prediction markets from Polymarket. Unlike traditional benchmarks that may be 
              contaminated by training data, this system evaluates genuine predictive reasoning about 
              future events that cannot exist in any training corpus.
            </p>
          </section>

          {/* Why This Matters */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">1. Introduction</h2>
            
            <h3 className="text-lg font-medium mb-3">1.1 Motivation</h3>
            <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
              Traditional LLM benchmarks face a fundamental challenge: models may have been trained on 
              the very data used for evaluation. This leads to benchmark saturation and inflated 
              performance metrics that don&apos;t reflect genuine reasoning capabilities.
            </p>
            
            <h3 className="text-lg font-medium mb-3">1.2 The Problem with Traditional Benchmarks</h3>
            <ul className="space-y-2 text-[var(--text-secondary)] mb-6">
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-rose)]">✗</span>
                <span><strong>Data contamination:</strong> Training data may contain benchmark answers</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-rose)]">✗</span>
                <span><strong>Memorization vs. reasoning:</strong> High scores may reflect memorization, not understanding</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-rose)]">✗</span>
                <span><strong>Static nature:</strong> Benchmarks become stale as models improve</span>
              </li>
            </ul>
            
            <h3 className="text-lg font-medium mb-3">1.3 Reality as Benchmark</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Prediction markets provide questions about future events—outcomes that cannot exist 
              in any training data because they haven&apos;t happened yet. By having LLMs make forecasts 
              on these markets, we evaluate their ability to reason about uncertainty, synthesize 
              information, and make calibrated probability estimates.
            </p>
          </section>

          {/* System Design */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">2. System Design</h2>
            
            <h3 className="text-lg font-medium mb-3">2.1 Cohort System</h3>
            <div className="glass-card p-4 mb-6">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 text-[var(--text-muted)]">Start frequency</td>
                    <td className="py-2 font-mono">Every Sunday 00:00 UTC</td>
                  </tr>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 text-[var(--text-muted)]">Models per cohort</td>
                    <td className="py-2 font-mono">{MODELS.length}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 text-[var(--text-muted)]">Starting capital</td>
                    <td className="py-2 font-mono">${INITIAL_BALANCE.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[var(--text-muted)]">Duration</td>
                    <td className="py-2 font-mono">Until all bets resolve</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h3 className="text-lg font-medium mb-3">2.2 Participating Models</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {MODELS.map(model => (
                <div key={model.id} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: model.color }}
                  />
                  <div>
                    <span className="font-medium">{model.displayName}</span>
                    <span className="text-[var(--text-muted)] text-sm ml-2">({model.provider})</span>
                  </div>
                </div>
              ))}
            </div>
            
            <h3 className="text-lg font-medium mb-3">2.3 Market Selection</h3>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              Markets are sourced from Polymarket&apos;s public API. We select the top {TOP_MARKETS_COUNT} markets 
              by trading volume to ensure liquidity and reliable price signals.
            </p>
          </section>

          {/* Decision Protocol */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">3. Decision Protocol</h2>
            
            <h3 className="text-lg font-medium mb-3">3.1 Information Provided</h3>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              Each week, LLMs receive their portfolio state (cash balance, open positions) and 
              market information (question, category, current price, volume, close date) for the 
              top 100 markets.
            </p>
            
            <h3 className="text-lg font-medium mb-3">3.2 Action Space</h3>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <span className="font-mono text-[var(--accent-emerald)]">BET</span>
                <span className="text-[var(--text-secondary)]">Place a new bet on a market (specify market, side, amount)</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <span className="font-mono text-[var(--accent-amber)]">SELL</span>
                <span className="text-[var(--text-secondary)]">Close or reduce an existing position (specify percentage)</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <span className="font-mono text-[var(--text-muted)]">HOLD</span>
                <span className="text-[var(--text-secondary)]">Take no action this week</span>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mb-3">3.3 Constraints</h3>
            <div className="glass-card p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-2 text-left text-[var(--text-muted)]">Constraint</th>
                    <th className="py-2 text-left text-[var(--text-muted)]">Value</th>
                    <th className="py-2 text-left text-[var(--text-muted)]">Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-2">Minimum bet</td>
                    <td className="py-2 font-mono">${MIN_BET}</td>
                    <td className="py-2 text-[var(--text-secondary)]">Prevents noise from trivial bets</td>
                  </tr>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-2">Maximum bet</td>
                    <td className="py-2 font-mono">{MAX_BET_PERCENT * 100}% of balance</td>
                    <td className="py-2 text-[var(--text-secondary)]">Encourages portfolio thinking</td>
                  </tr>
                  <tr>
                    <td className="py-2">Positions per market</td>
                    <td className="py-2 font-mono">1 per side</td>
                    <td className="py-2 text-[var(--text-secondary)]">Simplifies tracking</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Scoring */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">4. Scoring Methodology</h2>
            
            <h3 className="text-lg font-medium mb-3">4.1 Brier Score</h3>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              The Brier Score measures forecast accuracy. Lower is better (0 = perfect, 1 = worst).
            </p>
            <div className="glass-card p-4 mb-6 font-mono text-center">
              Brier = (forecast - outcome)²
            </div>
            
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              Implied confidence is derived from bet size:
            </p>
            <div className="glass-card p-4 mb-6 font-mono text-center">
              confidence = bet_amount / max_possible_bet
            </div>
            
            <h3 className="text-lg font-medium mb-3">4.2 Portfolio Returns</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Simple percentage return from the initial ${INITIAL_BALANCE.toLocaleString()} starting balance. 
              Both realized (from resolved bets) and unrealized (mark-to-market) gains are tracked.
            </p>
          </section>

          {/* Reproducibility */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">5. Reproducibility</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[var(--accent-emerald)] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  ✓
                </div>
                <div>
                  <h4 className="font-medium mb-1">Full Prompt Storage</h4>
                  <p className="text-[var(--text-secondary)] text-sm">
                    Complete system and user prompts stored for every decision.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[var(--accent-emerald)] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  ✓
                </div>
                <div>
                  <h4 className="font-medium mb-1">Temperature = 0</h4>
                  <p className="text-[var(--text-secondary)] text-sm">
                    Deterministic outputs for reproducibility.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[var(--accent-emerald)] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  ✓
                </div>
                <div>
                  <h4 className="font-medium mb-1">Open Source</h4>
                  <p className="text-[var(--text-secondary)] text-sm">
                    Complete codebase available for inspection and replication.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[var(--accent-emerald)] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  ✓
                </div>
                <div>
                  <h4 className="font-medium mb-1">Versioned Methodology</h4>
                  <p className="text-[var(--text-secondary)] text-sm">
                    Each cohort is tied to a specific methodology version.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[var(--border-subtle)] not-prose">
          <div className="flex flex-wrap gap-4">
            <a href={GITHUB_URL} className="btn btn-secondary text-sm">
              View on GitHub
            </a>
            <a href="/docs/METHODOLOGY_v1.md" className="btn btn-secondary text-sm">
              Download PDF
            </a>
          </div>
        </footer>
      </article>
    </div>
  );
}

