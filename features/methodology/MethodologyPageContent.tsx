import React from 'react';

import { DECISION_COHORT_LIMIT, INITIAL_BALANCE, MIN_BET, MAX_BET_PERCENT, TOP_MARKETS_COUNT, GITHUB_URL } from '@/lib/constants';
import { PageIntro } from '@/components/ui/PageIntro';
import type { PublicCatalogModel } from '@/lib/catalog/public';

interface MethodologyPageContentProps {
  models: PublicCatalogModel[];
}

export default function MethodologyPageContent({ models }: MethodologyPageContentProps) {
  return (
    <div>
      <PageIntro
        className="page-intro--document"
        eyebrow="Methodology"
        title="LLM Evaluation Grounded in Reality"
        description="Forecaster Arena evaluates language models on unsettled future events. Prediction markets, paper portfolios, and real-world resolutions make the benchmark verifiable."
        contentClassName="page-intro__content--measure"
        actions={(
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-emerald)]" />
            Methodology v2
          </div>
        )}
      />

      <div className="container-wide mx-auto px-6 py-12">
        <article className="prose prose-invert max-w-none">
          <div className="flow-xl">
            <section className="glass-card p-6 flow-sm">
              <h2 className="heading-block flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-blue)] text-sm font-bold text-white">A</span>
                Abstract
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Forecaster Arena is an LLM evaluation grounded in reality. Each model receives the same
                bankroll, the same market universe, and the same operating rules. It must convert its
                view of unsettled future events into paper-trading decisions, and those decisions are
                scored by the value of the resulting portfolio after real-world outcomes resolve.
              </p>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Methodology v2 ranks models by portfolio value. Historical v1 cohorts used calibration
                metrics as a secondary evaluation axis.
              </p>
            </section>

            <section className="flow-md">
              <h2>1. Evaluation Objective</h2>

              <div className="flow-sm">
                <h3>1.1 What the Benchmark Measures</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  The benchmark asks whether language models can make useful decisions about reality
                  before reality has settled. The task is not to answer a static test item. It is to act
                  under uncertainty, manage a constrained paper portfolio, and be judged by outcomes
                  that were unknown at decision time.
                </p>
              </div>

              <div className="flow-sm">
                <h3>1.2 Why Future Events</h3>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-emerald)]">+</span>
                    <span><strong>No answer memorization:</strong> resolved answers do not exist when decisions are logged</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-emerald)]">+</span>
                    <span><strong>External truth:</strong> outcomes are settled by real-world events, not subjective grading</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-emerald)]">+</span>
                    <span><strong>Continuous renewal:</strong> new events keep the benchmark from becoming a fixed answer key</span>
                  </li>
                </ul>
              </div>

              <div className="flow-sm">
                <h3>1.3 Prediction Markets as Substrate</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Prediction markets are not the benchmark itself. They provide a public, timestamped,
                  machine-readable stream of future-event questions, market prices, and resolution
                  criteria. That substrate makes reality comparable across models.
                </p>
              </div>
            </section>

            <section className="flow-md">
              <h2>2. Competition Design</h2>

              <div className="flow-sm">
                <h3>2.1 Cohorts</h3>
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
                      <tr className="border-b border-[var(--border-subtle)]">
                        <td className="py-2 text-[var(--text-muted)]">Decision window</td>
                        <td className="py-2 font-mono">Latest {DECISION_COHORT_LIMIT} cohort numbers</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-[var(--text-muted)]">Duration</td>
                        <td className="py-2 font-mono">Tracked until positions resolve or settle</td>
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
                <h3>2.3 Market Universe</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Markets are sourced from Polymarket&apos;s public API. For each decision run, the
                  benchmark presents the top {TOP_MARKETS_COUNT} markets by trading volume. The volume
                  filter keeps the universe liquid enough for meaningful paper execution while preserving
                  a simple rule that applies equally to every model.
                </p>
              </div>
            </section>

            <section className="flow-md">
              <h2>3. Decision Protocol</h2>

              <div className="flow-sm">
                <h3>3.1 Information Provided</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Every model in a decision-eligible cohort receives the same closed-book snapshot
                  for the run:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-gold)]">MARKET</span>
                    <span className="text-[var(--text-secondary)]">Question, market ID, current prices, volume, and close date</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-blue)]">PORTFOLIO</span>
                    <span className="text-[var(--text-secondary)]">Current cash, open positions, marked value, and unrealized P/L</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-violet)]">RULES</span>
                    <span className="text-[var(--text-secondary)]">Action schema, position limits, and bankroll constraints</span>
                  </div>
                </div>
              </div>

              <div className="flow-sm">
                <h3>3.2 Action Space</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-emerald)]">BET</span>
                    <span className="text-[var(--text-secondary)]">Open or add exposure to a market side or outcome</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--accent-amber)]">SELL</span>
                    <span className="text-[var(--text-secondary)]">Reduce or close an existing position</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="font-mono text-[var(--text-muted)]">HOLD</span>
                    <span className="text-[var(--text-secondary)]">Leave the portfolio unchanged for the week</span>
                  </div>
                </div>
              </div>

              <div className="flow-sm">
                <h3>3.3 Constraints</h3>
                <div className="glass-card p-4">
                  <div className="space-y-3 md:hidden">
                    {[
                      ['Minimum bet', `$${MIN_BET}`, 'Prevents noise from trivial paper positions'],
                      ['Maximum bet', `${MAX_BET_PERCENT * 100}% of cash`, 'Prevents all-in decisions from dominating a cohort'],
                      ['Positions per market', '1 per side', 'Keeps accounting and attribution auditable']
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
                          <th className="py-2 text-left text-[var(--text-muted)]">Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[var(--border-subtle)]">
                          <td className="py-2">Minimum bet</td>
                          <td className="py-2 font-mono">${MIN_BET}</td>
                          <td className="py-2 text-[var(--text-secondary)]">Prevents noise from trivial paper positions</td>
                        </tr>
                        <tr className="border-b border-[var(--border-subtle)]">
                          <td className="py-2">Maximum bet</td>
                          <td className="py-2 font-mono">{MAX_BET_PERCENT * 100}% of cash</td>
                          <td className="py-2 text-[var(--text-secondary)]">Prevents all-in decisions from dominating a cohort</td>
                        </tr>
                        <tr>
                          <td className="py-2">Positions per market</td>
                          <td className="py-2 font-mono">1 per side</td>
                          <td className="py-2 text-[var(--text-secondary)]">Keeps accounting and attribution auditable</td>
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
                <h3>4.1 Primary Ranking</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  The official v2 ranking is portfolio value. A model wins by growing its paper
                  portfolio under the same market universe, bankroll, and rules as every other
                  participant.
                </p>
                <div className="glass-card p-4 font-mono text-center">
                  portfolio_value = cash + marked_position_value
                </div>
              </div>

              <div className="flow-sm">
                <h3>4.2 Returns and Settlement</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Returns are measured from the initial ${INITIAL_BALANCE.toLocaleString()} starting balance.
                  Open positions are marked to current market prices, while resolved positions settle
                  according to the market outcome. The public leaderboard can show realized P/L,
                  unrealized P/L, win rate, and activity, but portfolio value is the primary score.
                </p>
              </div>

              <div className="flow-sm">
                <h3>4.3 Paper Trading Boundary</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Forecaster Arena does not execute real-money trades. Paper portfolios make model
                  decisions concrete, timestamped, comparable, and auditable without creating a consumer
                  trading product.
                </p>
              </div>
            </section>

            <section className="flow-md">
              <h2>5. Non-Gameability and Auditability</h2>
              <div className="space-y-4">
                {[
                  ['Future outcomes', 'Models cannot memorize outcomes that have not happened yet.'],
                  ['Decision logs', 'Prompts, responses, parsed actions, and trades are stored before outcomes resolve.'],
                  ['Shared snapshots', 'All competitors receive the same market and portfolio context for a run.'],
                  ['Deterministic accounting', 'Cash, shares, positions, settlements, and P/L are computed by fixed rules.']
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
              <a href={`${GITHUB_URL}/blob/main/docs/METHODOLOGY_v2.md`} target="_blank" rel="noreferrer" className="btn btn-secondary text-sm">
                View Methodology v2 Source
              </a>
              <a href={`${GITHUB_URL}/blob/main/docs/METHODOLOGY_v1.md`} target="_blank" rel="noreferrer" className="btn btn-secondary text-sm">
                Historical v1 Methodology
              </a>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
