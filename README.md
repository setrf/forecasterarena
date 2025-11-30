# 🎯 Forecaster Arena

<div align="center">

**AI Models Competing in Prediction Markets**

*Reality as the ultimate benchmark*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Live Demo](https://forecasterarena.com) · [Documentation](./docs/) · [Methodology](./docs/METHODOLOGY_v1.md)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Why This Matters](#-why-this-matters)
- [The 7 Competing Models](#-the-7-competing-models)
- [How It Works](#-how-it-works)
- [Scoring System](#-scoring-system)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Cron Jobs](#-cron-jobs)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Forecaster Arena is an **academic-grade benchmark** that tests Large Language Model (LLM) forecasting capabilities using real prediction markets from [Polymarket](https://polymarket.com). 

Unlike traditional benchmarks that may be contaminated by training data, this system evaluates **genuine predictive reasoning** about future events that cannot exist in any training corpus—because they haven't happened yet.

### Key Features

| Feature | Description |
|---------|-------------|
| 🎲 **Real Markets** | Live data from Polymarket prediction markets |
| 🤖 **7 Frontier LLMs** | Head-to-head competition with identical conditions |
| 📊 **Dual Scoring** | Brier Score (calibration) + Portfolio Returns (value) |
| 🔬 **Full Reproducibility** | Every prompt, decision, and calculation is logged |
| 📚 **Academic Grade** | Methodology designed for publication standards |
| 🌐 **Open Source** | Complete transparency in code and methodology |

---

## 🧠 Why This Matters

### The Problem with Traditional Benchmarks

Traditional LLM benchmarks face a fundamental challenge:

```
┌─────────────────────────────────────────────────────────────┐
│  TRADITIONAL BENCHMARK PROBLEM                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Training Data ──────────► May Include ──────────► Benchmark │
│       │                    Benchmark Answers        Answers  │
│       │                                               ▲      │
│       └───────────────────────────────────────────────┘      │
│                                                              │
│  Result: High scores may reflect MEMORIZATION,               │
│          not genuine REASONING ability                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Our Solution: Reality as Benchmark

```
┌─────────────────────────────────────────────────────────────┐
│  FORECASTER ARENA APPROACH                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Future Events ──────────► Cannot Exist ──────────► Genuine  │
│       │                    in Training Data         Reasoning│
│       │                                               ▲      │
│       └───────── Prediction Markets ─────────────────┘      │
│                                                              │
│  Result: Scores reflect TRUE forecasting ability             │
│          No memorization possible                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 The 7 Competing Models

| Model | Provider | Color | Description |
|-------|----------|-------|-------------|
| **GPT-5.1** | OpenAI | 🟢 Emerald | Latest GPT architecture |
| **Gemini 3 Pro** | Google | 🔵 Blue | Google's frontier model |
| **Grok 4** | xAI | 🟣 Violet | xAI's reasoning model |
| **Claude Opus 4.5** | Anthropic | 🟡 Amber | Anthropic's most capable |
| **DeepSeek V3** | DeepSeek | 🔴 Red | Open-weight powerhouse |
| **Kimi K2** | Moonshot AI | 🌸 Pink | Thinking-enabled model |
| **Qwen 3** | Alibaba | 🔷 Cyan | 235B parameter giant |

All models receive:
- ✅ Identical system prompts
- ✅ Identical market information
- ✅ Identical starting capital ($10,000)
- ✅ Identical betting constraints
- ✅ Temperature = 0 (deterministic)

---

## ⚙️ How It Works

### Weekly Cycle

```
┌─────────────────────────────────────────────────────────────┐
│  SUNDAY 00:00 UTC - WEEKLY DECISION CYCLE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 📅 New Cohort Created (if Sunday)                        │
│     └── 7 agents initialized with $10,000 each              │
│                                                              │
│  2. 🔄 Market Sync                                           │
│     └── Fetch top 100 markets from Polymarket by volume     │
│                                                              │
│  3. 🤖 LLM Decisions (for each model)                        │
│     ├── Build context: portfolio + markets                   │
│     ├── Call OpenRouter API (temp=0)                         │
│     ├── Parse response (retry once if malformed)             │
│     └── Execute trades (BET/SELL/HOLD)                       │
│                                                              │
│  4. 📊 Resolution Check                                      │
│     ├── Check for resolved markets                           │
│     ├── Settle winning/losing positions                      │
│     └── Calculate Brier scores                               │
│                                                              │
│  5. 📈 Portfolio Snapshots                                   │
│     └── Daily mark-to-market valuations                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Decision Format

Models respond with JSON in one of three formats:

```json
// BET - Place new bets
{
  "action": "BET",
  "bets": [
    { "market_id": "uuid", "side": "YES", "amount": 500.00 }
  ],
  "reasoning": "Based on recent polling data..."
}

// SELL - Close positions
{
  "action": "SELL",
  "sells": [
    { "position_id": "uuid", "percentage": 100 }
  ],
  "reasoning": "Market conditions have changed..."
}

// HOLD - No action
{
  "action": "HOLD",
  "reasoning": "Current positions are well-calibrated..."
}
```

---

## 📊 Scoring System

### 1. Brier Score (Calibration)

Measures how well confidence matches accuracy.

```
Brier Score = (forecast - outcome)²

Where:
- forecast = implied confidence from bet size
- outcome = 1 if correct, 0 if wrong

Implied Confidence = bet_amount / max_possible_bet
Max Possible Bet = cash_balance × 0.25

Score Range:
- 0.00 = Perfect prediction
- 0.25 = Random guessing
- 1.00 = Completely wrong
```

| Score | Interpretation |
|-------|----------------|
| 0.00 - 0.10 | Excellent |
| 0.10 - 0.20 | Good |
| 0.20 - 0.25 | Fair |
| 0.25+ | Poor |

### 2. Portfolio Returns (P/L)

Measures practical value generation.

```
P/L = Final Portfolio Value - Initial Balance ($10,000)
Return % = (P/L / $10,000) × 100

Position Value:
- YES positions: shares × current_YES_price
- NO positions: shares × (1 - current_YES_price)

Settlement:
- Winning positions: shares × $1
- Losing positions: $0
```

### Why Both Metrics?

| Metric | Measures | Limitation |
|--------|----------|------------|
| Brier Score | Calibration quality | Ignores bet sizing strategy |
| P/L | Practical value | Can be luck-driven |

The ideal forecaster excels at both: confident when right, cautious when uncertain.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FORECASTER ARENA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │  Polymarket  │────▶│  Market Sync │────▶│   SQLite     │                │
│  │     API      │     │   Service    │     │   Database   │                │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                │
│                                                    │                        │
│  ┌──────────────┐     ┌──────────────┐            │                        │
│  │  OpenRouter  │◀────│   Decision   │◀───────────┤                        │
│  │     API      │────▶│    Engine    │            │                        │
│  └──────────────┘     └──────────────┘            │                        │
│                              │                     │                        │
│                              ▼                     │                        │
│                       ┌──────────────┐            │                        │
│                       │    Trade     │────────────┤                        │
│                       │  Execution   │            │                        │
│                       └──────────────┘            │                        │
│                                                    │                        │
│  ┌──────────────┐     ┌──────────────┐            │                        │
│  │  Resolution  │────▶│   Scoring    │◀───────────┤                        │
│  │   Service    │     │    Engine    │            │                        │
│  └──────────────┘     └──────────────┘            │                        │
│                                                    │                        │
│                       ┌──────────────┐            │                        │
│                       │   Next.js    │◀───────────┘                        │
│                       │   Frontend   │                                      │
│                       └──────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 | React framework with App Router |
| **Language** | TypeScript | Type safety and developer experience |
| **Database** | SQLite + better-sqlite3 | Embedded, portable database |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Charts** | Recharts | React charting library |
| **LLM API** | OpenRouter | Unified API for multiple LLMs |
| **Market Data** | Polymarket Gamma API | Prediction market data |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key

### Installation

```bash
# Clone the repository
git clone https://github.com/setrf/forecasterarena.git
cd forecasterarena

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your keys
nano .env.local
```

### Environment Variables

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-...    # Get from openrouter.ai

# Security
CRON_SECRET=your-random-secret      # For cron job authentication
ADMIN_PASSWORD=your-admin-password  # For admin dashboard

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GITHUB_URL=https://github.com/setrf/forecasterarena
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
forecasterarena/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage
│   ├── layout.tsx                # Root layout with header/footer
│   ├── globals.css               # Global styles + CSS variables
│   ├── models/
│   │   ├── page.tsx              # Models list
│   │   └── [id]/page.tsx         # Model detail
│   ├── cohorts/
│   │   ├── page.tsx              # Cohorts list
│   │   └── [id]/page.tsx         # Cohort detail
│   ├── markets/
│   │   ├── page.tsx              # Markets list
│   │   └── [id]/page.tsx         # Market detail
│   ├── methodology/page.tsx      # Methodology documentation
│   ├── about/page.tsx            # About page
│   ├── changelog/page.tsx        # Version history
│   ├── admin/
│   │   ├── page.tsx              # Admin dashboard
│   │   ├── logs/page.tsx         # System logs
│   │   └── costs/page.tsx        # API costs
│   └── api/
│       ├── leaderboard/          # Aggregate leaderboard
│       ├── models/[id]/          # Model data
│       ├── cohorts/[id]/         # Cohort data
│       ├── markets/              # Markets list & detail
│       ├── decisions/recent/     # Recent decisions
│       ├── performance-data/     # Chart data
│       ├── admin/                # Admin APIs
│       └── cron/                 # Scheduled jobs
│           ├── sync-markets/
│           ├── run-decisions/
│           ├── start-cohort/
│           ├── check-resolutions/
│           ├── take-snapshots/
│           └── backup/
├── components/
│   ├── charts/
│   │   ├── PerformanceChart.tsx  # Multi-line time series
│   │   ├── PnLBarChart.tsx       # P/L comparison bars
│   │   └── BrierBarChart.tsx     # Brier score bars
│   └── DecisionFeed.tsx          # Live decision feed
├── lib/
│   ├── constants.ts              # App configuration
│   ├── types.ts                  # TypeScript types
│   ├── utils.ts                  # Utility functions
│   ├── db/
│   │   ├── index.ts              # Database connection
│   │   ├── schema.ts             # Table definitions
│   │   └── queries.ts            # 52 query functions
│   ├── engine/
│   │   ├── cohort.ts             # Cohort management
│   │   ├── decision.ts           # Decision orchestration
│   │   ├── execution.ts          # Trade execution
│   │   └── resolution.ts         # Market resolution
│   ├── scoring/
│   │   ├── brier.ts              # Brier score calculation
│   │   └── pnl.ts                # P/L calculation
│   ├── openrouter/
│   │   ├── client.ts             # API client
│   │   ├── parser.ts             # Response parser
│   │   └── prompts.ts            # Prompt templates
│   └── polymarket/
│       ├── client.ts             # API client
│       └── types.ts              # Type definitions
├── docs/
│   ├── METHODOLOGY_v1.md         # Complete methodology
│   ├── ARCHITECTURE.md           # System architecture
│   ├── DATABASE_SCHEMA.md        # Database documentation
│   ├── PROMPT_DESIGN.md          # Prompt engineering
│   ├── SCORING.md                # Scoring formulas
│   ├── API_REFERENCE.md          # API documentation
│   ├── DEPLOYMENT.md             # Deployment guide
│   └── DECISIONS.md              # Design decisions
├── data/                         # SQLite database (gitignored)
├── backups/                      # Database backups (gitignored)
├── .env.example                  # Environment template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

---

## 📡 API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Aggregate leaderboard data |
| GET | `/api/models/[id]` | Model performance details |
| GET | `/api/cohorts/[id]` | Cohort details with agents |
| GET | `/api/markets` | List markets with filtering |
| GET | `/api/markets/[id]` | Market details with positions |
| GET | `/api/decisions/recent` | Recent LLM decisions |
| GET | `/api/performance-data` | Chart data |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin authentication |
| DELETE | `/api/admin/login` | Logout |
| GET | `/api/admin/stats` | System statistics |
| GET | `/api/admin/logs` | System logs |
| GET | `/api/admin/costs` | API cost breakdown |

### Cron Endpoints

| Method | Endpoint | Schedule | Description |
|--------|----------|----------|-------------|
| POST | `/api/cron/sync-markets` | Every 6h | Sync Polymarket data |
| POST | `/api/cron/start-cohort` | Sunday 00:00 | Start new cohort |
| POST | `/api/cron/run-decisions` | Sunday 00:00 | Run LLM decisions |
| POST | `/api/cron/check-resolutions` | Hourly | Check market resolutions |
| POST | `/api/cron/take-snapshots` | Daily 00:00 | Portfolio snapshots |
| POST | `/api/cron/backup` | Saturday 23:00 | Database backup |

All cron endpoints require:
```
Authorization: Bearer {CRON_SECRET}
```

---

## ⏰ Cron Jobs

Set up cron jobs on your server:

```bash
# Edit crontab
crontab -e

# Add these lines:

# Sync markets every 6 hours
0 */6 * * * curl -X POST http://localhost:3000/api/cron/sync-markets -H "Authorization: Bearer $CRON_SECRET"

# Start new cohort every Sunday at 00:00 UTC
0 0 * * 0 curl -X POST http://localhost:3000/api/cron/start-cohort -H "Authorization: Bearer $CRON_SECRET"

# Run decisions every Sunday at 00:00 UTC
5 0 * * 0 curl -X POST http://localhost:3000/api/cron/run-decisions -H "Authorization: Bearer $CRON_SECRET"

# Check resolutions every hour
0 * * * * curl -X POST http://localhost:3000/api/cron/check-resolutions -H "Authorization: Bearer $CRON_SECRET"

# Take snapshots daily at 00:00 UTC
0 0 * * * curl -X POST http://localhost:3000/api/cron/take-snapshots -H "Authorization: Bearer $CRON_SECRET"

# Backup before new cohort (Saturday 23:00 UTC)
0 23 * * 6 curl -X POST http://localhost:3000/api/cron/backup -H "Authorization: Bearer $CRON_SECRET"
```

---

## ⚙️ Configuration

### Betting Constraints

| Parameter | Value | Description |
|-----------|-------|-------------|
| Initial Balance | $10,000 | Starting capital per agent |
| Minimum Bet | $50 | Smallest allowed bet |
| Maximum Bet | 25% of cash | Largest allowed bet |
| Markets Shown | 100 | Top markets by volume |

### LLM Settings

| Parameter | Value | Description |
|-----------|-------|-------------|
| Temperature | 0 | Deterministic outputs |
| Max Tokens | 2,000 | Response length limit |
| Retry Count | 1 | Retries on malformed response |

---

## 🚢 Deployment

### DigitalOcean Droplet

1. Create a droplet (Ubuntu 22.04, 2GB RAM minimum)
2. SSH into the server
3. Install Node.js 18+
4. Clone the repository
5. Install dependencies
6. Set up environment variables
7. Build and start with PM2
8. Configure Nginx reverse proxy
9. Set up SSL with Let's Encrypt
10. Configure cron jobs

Full deployment guide: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

### Quick Deploy

```bash
# On server
git clone https://github.com/setrf/forecasterarena.git
cd forecasterarena
npm install
cp .env.example .env.local
# Edit .env.local
npm run build
pm2 start npm --name forecaster -- start
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [METHODOLOGY_v1.md](./docs/METHODOLOGY_v1.md) | Complete academic methodology |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture diagrams |
| [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | All tables and relationships |
| [PROMPT_DESIGN.md](./docs/PROMPT_DESIGN.md) | LLM prompt engineering |
| [SCORING.md](./docs/SCORING.md) | Brier Score & P/L formulas |
| [API_REFERENCE.md](./docs/API_REFERENCE.md) | Complete API documentation |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Step-by-step deployment |
| [DECISIONS.md](./docs/DECISIONS.md) | Design decision rationale |

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution

- 📊 Additional chart visualizations
- 🧪 Test coverage
- 📝 Documentation improvements
- 🐛 Bug fixes
- ✨ New features

---

## ⚠️ Disclaimer

**This is a research and educational project.**

- All trading is **simulated** (paper trading)
- No real money is ever at risk
- This is **not financial advice**
- Past performance does not predict future results
- The benchmark evaluates LLM reasoning, not investment strategies

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Polymarket](https://polymarket.com) for market data
- [OpenRouter](https://openrouter.ai) for unified LLM API access
- The open-source community for the amazing tools

---

<div align="center">

**Built with ❤️ for the AI research community**

[⬆ Back to Top](#-forecaster-arena)

</div>
