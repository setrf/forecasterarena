# Forecaster Arena Methodology v2

Forecaster Arena v2 is an LLM evaluation grounded in reality. Models make paper-trading decisions about unsettled future events, and those decisions are scored after real-world outcomes resolve.

Prediction markets are the evaluation substrate, not the philosophical center of the product. They provide public questions, timestamped prices, external resolution criteria, and a machine-readable way to compare decisions across models.

## Objective: Evaluate LLMs Against Unsettled Reality

The core question is whether a language model can make useful decisions before the answer exists.

Each model receives the same bankroll, the same market universe, and the same rules. It must choose whether to `BET`, `SELL`, or `HOLD` based on the available market and portfolio context. The benchmark then waits for reality to settle the underlying questions and ranks models by the resulting paper portfolio value.

This makes the evaluation different from static question answering:

- the correct outcome is not known at decision time
- decisions are timestamped before resolution
- outcomes are settled by external real-world events
- portfolio accounting is deterministic and reproducible

## Why Future Events

Future events make the benchmark resistant to benchmark memorization. A model cannot memorize the result of an event that has not happened yet, and a benchmark operator does not need to invent a subjective grading rubric.

The task is also naturally continuous. As old markets resolve, new markets enter the universe. The benchmark is therefore less likely to collapse into a fixed answer key and more able to track model performance over time.

## Why Prediction Markets

Prediction markets give Forecaster Arena a practical, verifiable substrate for future-event evaluation:

- public future-event questions
- timestamped market prices
- public volume and liquidity signals
- externally defined resolution criteria
- resolved outcomes that can be audited later

The market price is not treated as truth. It is context. Models are evaluated on what they do with that context under equal constraints.

## Cohorts and Fair Conditions

Forecaster Arena runs models in cohorts. A cohort is a fixed evaluation round with a frozen lineup and rule set.

Within a cohort:

- every model starts with the same paper bankroll
- every model receives the same market snapshot
- every model receives the same action schema
- every model is subject to the same position and bankroll constraints
- every decision is logged before market outcomes resolve

This keeps the comparison about model behavior, not about unequal access, changing rules, or retroactive scoring.

To keep the live evaluation operationally sustainable, only the latest decision window receives new weekly LLM calls. The production default is the newest five cohort numbers. Older unarchived v2 cohorts do not re-enter decision eligibility, but they remain live for portfolio snapshots, resolution checks, current leaderboards, drilldowns, and audit history until their markets settle.

Historical v1 cohorts are archived. Archived cohorts remain publicly accessible by direct cohort and cohort-model pages, but they are excluded from current v2 leaderboards, model averages, global and model-family charts, recent-decision feeds, lineup refreshes, and routine snapshots.

## Market Universe: Top-Volume Polymarket Markets

The v2 market universe remains the top-volume Polymarket markets used by the benchmark.

Volume filtering gives the evaluation a simple, reproducible market-selection rule while keeping the task focused on markets with meaningful activity. The benchmark does not hand-pick markets for individual models, and it does not alter the market universe based on a model's prior decisions.

## Decision Protocol: `BET`, `SELL`, `HOLD`

At each decision run, a model chooses one valid action:

- `BET`: open or add exposure to a market side or outcome
- `SELL`: reduce or close an existing paper position
- `HOLD`: leave the portfolio unchanged

The prompt includes the current market snapshot, the model's paper portfolio state, and the rules governing valid actions. The model response is parsed into a deterministic action record. Invalid or unparseable actions are logged rather than silently rewritten into better decisions.

Decision runs apply only to unarchived active cohorts inside the latest decision window. Tracking-only v2 cohorts keep their existing positions and continue to be scored as reality resolves. Archived v1 cohorts keep their historical records and may still settle positions when markets resolve, but they no longer participate in current v2 scoring.

## Portfolio Accounting and Ranking

Methodology v2 ranks models by portfolio value.

```text
portfolio_value = cash + marked_position_value
```

Starting bankroll is equal across competitors. Open positions are marked to current market prices. Resolved positions settle according to the market outcome. Realized P/L, unrealized P/L, win rate, and activity are useful secondary statistics, but they are not the primary winner-selection metric.

Forecaster Arena is paper trading only. It does not execute real-money trades, provide investment advice, or present the benchmark as a consumer trading product.

## Auditability and Reproducibility

The methodology is designed so that results can be inspected after the fact:

- prompts, model responses, parsed decisions, and paper trades are logged
- decision records are created before outcomes resolve
- competitors see the same timestamped market snapshot within a run
- portfolio accounting follows fixed cash, position, settlement, and mark-to-market rules
- cohort, model, and methodology versions are stored with historical records
- archive metadata makes v1 history accessible without mixing it into current v2 results

This makes the tools non-gameable in the relevant evaluation sense: models cannot memorize future outcomes, decisions cannot be scored against private criteria, and portfolio value can be recomputed from logged state.

## Limitations

Prediction markets are an imperfect proxy for reality. They reflect market design choices, available liquidity, user participation, fees or frictions in the real market, and the quality of resolution criteria.

Paper portfolios also simplify real execution. They are useful because they make decisions concrete and comparable, not because they claim to simulate every detail of real trading.

Methodology v2 should therefore be read as a reality-grounded LLM evaluation protocol, not as a complete theory of intelligence, forecasting, or financial performance.

## Differences from v1

Version 1 used a dual framing: probabilistic calibration metrics and portfolio returns. Brier score and calibration were useful historical diagnostics, but they made the public methodology less direct than the core evaluation claim.

Version 2 changes the center of gravity:

- primary ranking is portfolio value / P&L
- prediction markets are described as the substrate for verifiable future-event evaluation
- calibration and Brier score are removed from the core public methodology
- paper portfolios are presented as auditable evaluation tools, not as real-money trading
- v2 applies only to future cohorts after deployment

Historical v1 cohorts remain historical v1 cohorts. Their records should continue to be interpreted under the protocol that was active when those cohorts ran.

In the live application, v1 cohorts are archived: accessible for history and audit, excluded from current v2 aggregate ranking and chart surfaces, and settle-only for any remaining open positions.
