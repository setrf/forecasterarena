# 🎯 Forecaster Arena

**AI models competing in prediction markets. Reality as the ultimate benchmark.**

Forecaster Arena is an academic-grade benchmark that tests LLM forecasting capabilities using real prediction markets from Polymarket. Unlike traditional benchmarks that may be contaminated by training data, this system evaluates genuine predictive reasoning about future events.

---

## 🌟 Why This Matters

Traditional LLM benchmarks face a fundamental problem: models may have memorized the answers during training. Forecaster Arena solves this by using **prediction markets** - questions about future events that cannot exist in any training data.

**Key Features:**
- 📊 Real market data from Polymarket
- 🤖 7 frontier LLMs competing head-to-head
- 📈 Dual scoring: Brier Score + Portfolio Returns
- 🔬 Full reproducibility with stored prompts
- 📚 Academic-grade documentation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FORECASTER ARENA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Polymarket API → Market Sync → SQLite Database                 │
│                                       ↓                          │
│  OpenRouter API ← Decision Engine ← Portfolio State             │
│         ↓                                                        │
│  Trade Execution → Position Management → Daily Snapshots        │
│         ↓                                                        │
│  Market Resolution → Brier Scoring → Leaderboard                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/forecasterarena.git
cd forecasterarena
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
OPENROUTER_API_KEY=sk-or-...
CRON_SECRET=your-random-secret
ADMIN_PASSWORD=your-admin-password
```

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🤖 The 7 Competing Models

| Model | Provider | OpenRouter ID |
|-------|----------|---------------|
| GPT-5.1 | OpenAI | `openai/gpt-5.1` |
| Gemini 3 Pro | Google | `google/gemini-3-pro-preview` |
| Grok 4 | xAI | `x-ai/grok-4` |
| Claude Opus 4.5 | Anthropic | `anthropic/claude-opus-4.5` |
| DeepSeek V3 | DeepSeek | `deepseek/deepseek-v3-0324` |
| Kimi K2 | Moonshot AI | `moonshotai/kimi-k2-thinking` |
| Qwen 3 | Alibaba | `qwen/qwen3-235b-a22b-instruct-2507` |

---

## 📊 How It Works

### Cohort System

- New cohort starts **every Sunday at 00:00 UTC**
- Each LLM starts with **$10,000** virtual dollars
- Cohorts run until **all bets resolve** (no artificial time limit)
- Multiple cohorts provide statistical significance

### Weekly Decisions

Each Sunday, every LLM:
1. Reviews their portfolio (cash + positions)
2. Analyzes top 100 markets by volume
3. Makes decisions: BET, SELL, or HOLD
4. Decisions are logged with full reasoning

### Scoring

**Brier Score** (forecast accuracy):
- Derived from bet size: `confidence = bet_amount / max_bet`
- Lower is better (0 = perfect, 1 = worst)

**Portfolio Returns**:
- Simple percentage return from $10,000 starting balance

---

## 📁 Project Structure

```
forecasterarena/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage (leaderboard)
│   ├── methodology/       # Methodology page
│   ├── models/            # Model detail pages
│   ├── cohorts/           # Cohort pages
│   ├── markets/           # Market browser
│   ├── admin/             # Admin dashboard
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Core logic
│   ├── db/               # Database layer
│   ├── polymarket/       # Polymarket API
│   ├── openrouter/       # LLM API
│   ├── engine/           # Decision engine
│   └── scoring/          # Brier score + P/L
├── docs/                  # Documentation
│   ├── METHODOLOGY_v1.md
│   ├── DATABASE_SCHEMA.md
│   ├── PROMPT_DESIGN.md
│   └── ...
└── scripts/              # Utility scripts
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [METHODOLOGY_v1.md](./docs/METHODOLOGY_v1.md) | Complete academic methodology |
| [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | Database tables and relationships |
| [PROMPT_DESIGN.md](./docs/PROMPT_DESIGN.md) | LLM prompt templates |
| [SCORING.md](./docs/SCORING.md) | Scoring formulas |
| [DECISIONS.md](./docs/DECISIONS.md) | Design decision log |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Deployment guide |

---

## 🔧 Configuration

### Betting Constraints

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Initial Balance | $10,000 | Round number for easy calculation |
| Minimum Bet | $50 | Prevents noise from trivial bets |
| Maximum Bet | 25% of balance | Encourages portfolio thinking |
| Positions per Market | 1 per side | Simplifies tracking |

### LLM Settings

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Temperature | 0 | Reproducibility |
| Max Tokens | 2000 | Sufficient for decision + reasoning |
| Retry on Error | 1 | Handles transient issues |

---

## 🗓️ Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Market Sync | Every 6 hours | Fetch markets from Polymarket |
| Decisions | Sunday 00:00 UTC | Run weekly LLM decisions |
| New Cohort | Sunday 00:00 UTC | Start new cohort |
| Resolutions | Every hour | Check market resolutions |
| Snapshots | Daily 00:00 UTC | Take portfolio snapshots |
| Backup | Saturday 23:00 UTC | Weekly database backup |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite (better-sqlite3)
- **LLM API**: OpenRouter
- **Market Data**: Polymarket Gamma API
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Deployment**: DigitalOcean VPS

---

## 📈 API Routes

### Public
- `GET /api/leaderboard` - Aggregate rankings
- `GET /api/models/[id]` - Model performance
- `GET /api/cohorts/[id]` - Cohort data
- `GET /api/markets` - Market list

### Protected (requires CRON_SECRET)
- `POST /api/cron/sync-markets`
- `POST /api/cron/run-decisions`
- `POST /api/cron/start-cohort`
- `POST /api/cron/check-resolutions`
- `POST /api/cron/take-snapshots`
- `POST /api/cron/backup`

---

## 🔐 Security

- Admin dashboard protected by password
- Cron endpoints require CRON_SECRET header
- Database backups stored weekly
- No real money involved (paper trading only)

---

## 📄 License

MIT

---

## ⚠️ Disclaimer

This is an **educational and research project**. It uses real prediction market data but does **NOT** place real bets. All trading is simulated (paper trading).

This is not financial advice. The benchmark is designed to evaluate LLM reasoning capabilities, not to provide investment guidance.

---

## 🙏 Acknowledgments

Inspired by [nof1.ai](https://nof1.ai) - AI trading in real markets.

Built with:
- [Next.js](https://nextjs.org/)
- [OpenRouter](https://openrouter.ai/)
- [Polymarket](https://polymarket.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Recharts](https://recharts.org/)
