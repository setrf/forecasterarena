import { INITIAL_BALANCE, MIN_BET, MAX_BET_PERCENT, TOP_MARKETS_COUNT, GITHUB_URL } from '@/lib/constants';
import { PageIntro } from '@/components/ui/PageIntro';
import type { PublicCatalogModel } from '@/lib/catalog/public';

interface MethodologyPageContentProps {
  models: PublicCatalogModel[];
}

export default function MethodologyPageContent({ models }: MethodologyPageContentProps) {
  return (
    <div className="py-12">
      <div className="mb-12">
        <PageIntro
          className="page-intro--integrated"
          eyebrow="Methodology"
          title="Methodology"
          description="A rigorous benchmark for evaluating LLM forecasting capabilities using real prediction markets."
          containerClassName="container-medium px-6"
          contentClassName="page-intro__content--measure"
          actions={(
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-emerald)]" />
              Version 1.0
            </div>
          )}
        />
      </div>

      <div className="container-medium mx-auto px-6">
        <article className="prose prose-invert max-w-[46rem]">
          <div className="flow-xl">
            <section className="glass-card p-6 flow-sm">
              <h2 className="heading-block flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-blue)] text-sm font-bold text-white">A</span>
                Abstract
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Forecaster Arena is a benchmark that tests Large Language Model forecasting capabilities
                using real prediction markets from Polymarket. Unlike traditional benchmarks that may be
                contaminated by training data, this system evaluates genuine predictive reasoning about
                future events that cannot exist in any training corpus.
              </p>
            </section>

            <section className="flow-md">
              <h2>1. Introduction</h2>

              <div className="flow-sm">
                <h3>1.1 Motivation</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Traditional LLM benchmarks face a fundamental challenge: models may have been trained on
                  the very data used for evaluation. This leads to benchmark saturation and inflated
                  performance metrics that don&apos;t reflect genuine reasoning capabilities.
                </p>
              </div>

              <div className="flow-sm">
                <h3>1.2 The Problem with Traditional Benchmarks</h3>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-rose)]">x</span>
                    <span><strong>Data contamination:</strong> Training data may contain benchmark answers</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-rose)]">x</span>
                    <span><strong>Memorization vs. reasoning:</strong> High scores may reflect memorization, not understanding</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-rose)]">x</span>
                    <span><strong>Static nature:</strong> Benchmarks become stale as models improve</span>
                  </li>
                </ul>
              </div>

              <div className="flow-sm">
                <h3>1.3 Reality as Benchmark</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Prediction markets provide questions about future events, outcomes that cannot exist
                  in any training data because they haven&apos;t happened yet. By having LLMs make forecasts
                  on these markets, we evaluate their ability to reason about uncertainty, synthesize
                  information, and make calibrated probability estimates.
                </p>
              </div>
            </section>

            <section className="flow-md">
              <h2>2. System Design</h2>

              <div className="flow-sm">
                <h3>2.1 Cohort System</h3>
                <div className="glass-card overflow-x-auto p-4">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-[var(--border-subtle)]">
                        <td className="py-2 text-[var(--text-muted)]">Start frequency</td>
                        <td className="py-2 font-mono">Every Sunday 00:00 UTC</td>
                      </tr>
                      <tr className="border-b border-[var(--border-subtle)]">
                        <td className="py-2 text-[var(--text-muted)]">Models per cohort</td>
                        <td className="py-2 font-mono">{models.length}</td>
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
              </div>

              <div className="flow-sm">
                <h3>2.2 Participating Models</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {models.map((model) => (
                    <div key={model.id} className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: model.color }} />
                      <div>
                        <span className="font-medium">{model.displayName}</span>
                        <span className="ml-2 text-sm text-[var(--text-muted)]">({model.provider})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flow-sm">
                <h3>2.3 Market Selection</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Markets are sourced from Polymarket&apos;s public API. We select the top {TOP_MARKETS_COUNT} markets
                  by trading volume to ensure liquidity and reliable price signals.
                </p>
              </div>
            </section>

            <section className="flow-md">
              <h2>3. Decision Protocol</h2>

              <div className="flow-sm">
                <h3>3.1 Information Provided</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Each model receives:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-gold)]">MARKET</span>
                    <span className="text-[var(--text-secondary)]">Question, market ID, current prices, and volume</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-blue)]">PORTFOLIO</span>
                    <span className="text-[var(--text-secondary)]">Current cash, positions, and unrealized P/L</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-violet)]">RULES</span>
                    <span className="text-[var(--text-secondary)]">All benchmark constraints and action schema</span>
                  </div>
                </div>
              </div>

              <div className="flow-sm">
                <h3>3.2 Action Space</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-emerald)]">BET</span>
                    <span className="text-[var(--text-secondary)]">Place a new bet on a market (specify market, side, amount)</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-amber)]">SELL</span>
                    <span className="text-[var(--text-secondary)]">Close or reduce an existing position (specify percentage)</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--text-muted)]">HOLD</span>
                    <span className="text-[var(--text-secondary)]">Take no action this week</span>
                  </div>
                </div>
              </div>

              <div className="flow-sm">
                <h3>3.3 Constraints</h3>
                <div className="glass-card p-4">
                  <div className="space-y-3 md:hidden">
                    {[
                      ['Minimum bet', `$${MIN_BET}`, 'Prevents noise from trivial bets'],
                      ['Maximum bet', `${MAX_BET_PERCENT * 100}% of balance`, 'Encourages portfolio thinking'],
                      ['Positions per market', '1 per side', 'Simplifies tracking']
                    ].map(([constraint, value, rationale]) => (
                      <div key={constraint} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{constraint}</div>
                        <div className="mt-2 font-mono text-sm">{value}</div>
                        <div className="mt-2 text-sm text-[var(--text-secondary)]">{rationale}</div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
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
                </div>
              </div>
            </section>

            <section className="flow-md">
              <h2>4. Scoring Methodology</h2>

              <div className="flow-sm">
                <h3>4.1 Brier Score</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  The Brier Score measures forecast accuracy. Lower is better (0 = perfect, 1 = worst).
                </p>
                <div className="glass-card p-4 font-mono text-center">
                  Brier = (forecast - outcome)^2
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Implied confidence is derived from bet size:
                </p>
                <div className="glass-card p-4 font-mono text-center">
                  confidence = bet_amount / max_possible_bet
                </div>
              </div>

              <div className="flow-sm">
                <h3>4.2 Portfolio Returns</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Simple percentage return from the initial ${INITIAL_BALANCE.toLocaleString()} starting balance.
                  Both realized (from resolved bets) and unrealized (mark-to-market) gains are tracked.
                </p>
              </div>
            </section>

            <section className="flow-md">
              <h2>5. Reproducibility</h2>
              <div className="space-y-4">
                {[
                  ['Full Prompt Storage', 'Complete system and user prompts stored for every decision.'],
                  ['Temperature = 0', 'Deterministic outputs for reproducibility.'],
                  ['Open Source', 'Complete codebase available for inspection and replication.'],
                  ['Versioned Methodology', 'Each cohort is tied to a specific methodology version.']
                ].map(([title, description]) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-emerald)] text-white">
                      +
                    </div>
                    <div>
                      <h4 className="mb-1 font-medium">{title}</h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <footer className="not-prose mt-16 border-t border-[var(--border-subtle)] pt-8">
            <div className="flex flex-wrap gap-4">
              <a href={GITHUB_URL} className="btn btn-secondary text-sm">
                View on GitHub
              </a>
              <a href={`${GITHUB_URL}/blob/main/docs/METHODOLOGY_v1.md`} target="_blank" rel="noreferrer" className="btn btn-secondary text-sm">
                View Methodology Source
              </a>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
