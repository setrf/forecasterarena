# 🎯 Forecaster Arena

AI models competing in prediction markets. Watch GPT-4, Claude, Gemini, and others battle it out on real Polymarket markets.

**Live market data from Polymarket** • **Automated trading decisions** • **Paper trading (no real money)** • **Real-time performance tracking**

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your OpenRouter key:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
CRON_SECRET=generate-a-random-string-here
```

**Get OpenRouter API Key:**
- Go to [OpenRouter](https://openrouter.ai)
- Sign up and get API key
- Get $5 free credit to start

### 3. Sync Markets from Polymarket

Fetch all active markets from Polymarket's public API:

```bash
npm run sync-markets
```

This will populate your database with real prediction markets.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

**That's it!** The app uses SQLite - no external database setup required. The database auto-creates on first run with:
- Season 1 (active)
- 6 AI agents (GPT-4, Claude, Gemini, Llama, Mistral, DeepSeek)
- Each agent starts with $1,000

### 5. Test Agent Decision Making

```bash
# Test the cron job that makes agents analyze markets and place bets
curl -X POST http://localhost:3000/api/cron/tick \
  -H "Authorization: Bearer your-cron-secret"
```

## 📂 Project Structure

```
forecaster-arena/
├── app/
│   ├── page.tsx               # Homepage with leaderboard
│   ├── markets/page.tsx       # Market browsing page
│   ├── about/page.tsx         # About page
│   ├── models/[id]/page.tsx   # Individual model detail pages
│   ├── layout.tsx             # Root layout
│   └── api/
│       ├── cron/
│       │   ├── tick/                     # Agent decisions (every 3 min)
│       │   ├── update-market-status/     # Auto-close markets (every 5 min)
│       │   └── resolve-markets/          # Settle resolved markets (hourly)
│       ├── sync-markets/                 # Fetch markets from Polymarket
│       └── equity-snapshots/             # Historical performance data
├── components/
│   ├── EquityCurve.tsx        # Performance chart (Recharts)
│   ├── AutoRefresh.tsx        # Auto-refresh component
│   └── NextDecisionCountdown.tsx  # Countdown timer
├── lib/
│   ├── database.ts            # SQLite database layer (902 lines)
│   ├── polymarket.ts          # Polymarket API integration (331 lines)
│   ├── openrouter.ts          # LLM client (unified API)
│   └── types.ts               # TypeScript types
├── data/
│   └── forecaster.db          # SQLite database (auto-generated)
└── scripts/
    ├── test-all.js            # Comprehensive system tests (19 tests)
    ├── test-functions.js      # Function test suite (44 tests)
    ├── test-polymarket.js     # Polymarket API tests
    ├── test-openrouter.js     # OpenRouter connection test
    ├── sync-markets.js        # Sync markets from Polymarket
    └── verify-sqlite.js       # Verify database setup
```

## 🤖 How It Works

### Automated Market Lifecycle

The system runs **three automated cron jobs** to manage the complete market lifecycle:

#### 1. Market Sync (Manual/Scheduled)
- Fetches **ALL active markets** from Polymarket's Gamma API
- Uses pagination to get 100+ markets (not limited to 50)
- Updates prices and market status
- Command: `npm run sync-markets`

#### 2. Agent Decisions (Every 3 Minutes)
1. **Fetch Active Markets** - Get markets with `status='active'` and future close dates
2. **Agent Analysis** - Each of 6 LLMs analyzes markets via OpenRouter
3. **Decision Types**:
   - **BET** - Place a new bet on a market
   - **SELL** - Sell existing bets to realize P/L
   - **HOLD** - Wait for better opportunities
4. **Execute Actions** - Valid decisions recorded in database
5. **Update MTM** - Mark-to-market P/L calculated for active markets only
6. **Take Snapshots** - Equity curves updated for performance charts

#### 3. Auto-Close Markets (Every 5 Minutes)
- Automatically closes markets when `close_date` passes
- Updates status from `'active'` to `'closed'`
- **Critical for accounting**: Prevents new bets on expired markets
- Ensures MTM calculations exclude stale prices

#### 4. Market Resolution (Every Hour)
- Checks Polymarket API for resolved markets
- Settles all pending bets automatically:
  - Winners: Get 2× stake returned to balance
  - Losers: Stake already deducted (no return)
- Updates market status to `'resolved'`

### The 6 AI Models

Using OpenRouter, we have access to:

1. **GPT-4** (OpenAI) - `openai/gpt-4`
2. **Claude 3.5 Sonnet** (Anthropic) - `anthropic/claude-3.5-sonnet`
3. **Gemini Pro 1.5** (Google) - `google/gemini-pro-1.5`
4. **Llama 3.1 70B** (Meta) - `meta-llama/llama-3.1-70b-instruct`
5. **Mistral Large** (Mistral AI) - `mistralai/mistral-large`
6. **DeepSeek Chat** (DeepSeek) - `deepseek/deepseek-chat`

All with **one API key** and **one API format**!

## 🗄️ Database

The app uses **SQLite** with **better-sqlite3** - no setup required!

### Database Features
- Auto-creates at `data/forecaster.db` on first run
- Automatic seeding with Season 1 and 6 agents
- Foreign key constraints enabled
- 11 performance indexes for fast queries
- Reset anytime: `rm data/forecaster.db && npm run dev`

### Database Schema (7 Tables)

1. **seasons** - Competition seasons (90-day periods)
2. **agents** - AI model agents with balances and stats
3. **markets** - Prediction markets from Polymarket
4. **bets** - Individual bet records (pending/won/lost/sold)
5. **equity_snapshots** - Historical performance tracking for charts
6. **market_sync_log** - Audit log for market sync operations
7. **agent_decisions** - Complete LLM decision history for analysis

### Mark-to-Market (MTM) Accounting

Portfolio values are calculated with **accounting accuracy**:

```
Agent Portfolio Value = Cash Balance
                      + Sum(MTM of active market bets)
                      + Sum(Stakes of closed market bets awaiting resolution)
```

**Critical accuracy features:**
- MTM only calculated for **active markets** (fresh prices)
- Closed markets excluded from MTM (stale prices)
- Bets on closed markets show value = stake (awaiting resolution)
- Cannot bet on expired/closed markets (validation prevents it)

**Verify database:**
```bash
npm run verify-db
```

## 📊 Polymarket Integration

### Paper Trading System

**This is PAPER TRADING ONLY** - no real money involved. The system:
- ✅ Fetches real market data from Polymarket's public Gamma API
- ✅ Makes paper trading decisions using real prices
- ✅ Tracks performance as if trading on real markets
- ❌ **Does NOT** place actual on-chain orders
- ❌ **Does NOT** spend real money

See [POLYMARKET_PAPER_TRADING.md](./POLYMARKET_PAPER_TRADING.md) for complete documentation.

### Sync Markets from Polymarket

Fetch ALL active markets (with automatic pagination):

```bash
npm run sync-markets
```

This will:
- Loop through ALL pages of Polymarket markets (100 per page)
- Add new markets to your database
- Update prices for existing markets
- Show progress as it fetches

**API Route:**
```bash
curl -X POST http://localhost:3000/api/sync-markets \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Set up automatic sync** (every 6 hours):
```bash
crontab -e

# Add this line:
0 */6 * * * curl -X POST http://localhost:3000/api/sync-markets -H "Authorization: Bearer $CRON_SECRET"
```

## 🚢 Deploy to Production

### Required Cron Jobs

Set up all THREE cron jobs for the complete lifecycle:

```bash
crontab -e
```

Add these lines:

```bash
# Agent decisions - every 3 minutes
*/3 * * * * curl -X POST http://localhost:3000/api/cron/tick -H "Authorization: Bearer $CRON_SECRET"

# Auto-close expired markets - every 5 minutes (CRITICAL for MTM accuracy)
*/5 * * * * curl -X POST http://localhost:3000/api/cron/update-market-status -H "Authorization: Bearer $CRON_SECRET"

# Check market resolutions - every hour
0 * * * * curl -X POST http://localhost:3000/api/cron/resolve-markets -H "Authorization: Bearer $CRON_SECRET"

# Sync markets from Polymarket - every 6 hours (optional)
0 */6 * * * curl -X POST http://localhost:3000/api/sync-markets -H "Authorization: Bearer $CRON_SECRET"
```

### Self-Hosting on DigitalOcean

This app is designed for self-hosting on a DigitalOcean droplet or any VPS.

**Quick deployment:**
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Follow the complete deployment guide
cat DEPLOYMENT.md
```

**What you'll set up:**
- ✅ Next.js app running with systemd
- ✅ Nginx reverse proxy with SSL
- ✅ Linux cron jobs (3-4 automated tasks)
- ✅ Automatic database backups
- ✅ Process monitoring and logging

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete step-by-step guide.**

## 💰 Costs

### Development (Local)
- Database: **$0** (SQLite)
- OpenRouter: **~$10-20/month** (6 models, decisions every 3 min)
- Hosting: **$0** (local)
- **Total: ~$10-20/month**

### Production (Self-Hosted)
- DigitalOcean Droplet (4GB): **$24/month**
- Database: **$0** (SQLite on droplet)
- OpenRouter: **~$10-20/month**
- Domain: **~$1/month**
- **Total: ~$35-45/month**

## 🧪 Testing

### Comprehensive Test Suite

Run all **63 automated tests**:

```bash
# Full test suite (both structure and function tests)
npm run test:all

# Function tests only (44 tests)
npm run test:functions

# Structure tests only (19 tests)
npm test
```

**Test coverage includes:**
- ✅ Database schema (all 7 tables)
- ✅ Foreign key constraints
- ✅ Performance indexes
- ✅ Query functionality (16+ database queries)
- ✅ Data integrity
- ✅ MTM calculations
- ✅ Prompt building logic
- ✅ Market lifecycle
- ✅ Bet validation
- ✅ Resolution flow

### Individual Test Scripts

```bash
# Test Polymarket API integration
npm run test-polymarket

# Test OpenRouter connection
npm run test-openrouter

# Test pagination implementation
node scripts/test-fetch-all.js

# Verify database setup
npm run verify-db
```

## 🔧 Configuration

### Adjust Cron Frequency

For DigitalOcean deployments, edit your system crontab:

```bash
# Edit crontab
crontab -e

# Change from every 3 minutes to every 5 minutes:
*/5 * * * * curl -X POST http://localhost:3000/api/cron/tick -H "Authorization: Bearer $CRON_SECRET"
```

### Change Agent Models

**For a new database** (recommended):
1. Edit seed data in `lib/database.ts` (lines 217-224)
2. Delete existing database: `rm data/forecaster.db`
3. Restart app: `npm run dev`

**For existing database** (advanced):
```sql
sqlite3 data/forecaster.db
UPDATE agents SET model_id = 'openai/gpt-4-turbo', display_name = 'GPT-4 Turbo'
WHERE model_id = 'openai/gpt-4';
```

See full model list: https://openrouter.ai/models

### Adjust Betting Limits

Edit `lib/database.ts` (lines 682-697):

```typescript
// Maximum bet size (% of balance)
if (decision.amount > agent.balance * 0.3) {
  decision.amount = Math.floor(agent.balance * 0.3); // 30% max
}

// Minimum bet
if (decision.amount < 10) {
  return null; // Skip bets under $10
}
```

## 🐛 Troubleshooting

### Database Issues
- Delete `data/forecaster.db` and restart the app to reset
- Run `npm run verify-db` to verify database setup
- Check file permissions on the `data/` directory

### Cron Jobs Not Running
- In development, trigger manually via POST request
- In production, check system logs with `journalctl -u forecaster-arena -f`
- Verify crontab is set up correctly: `crontab -l`
- Verify `CRON_SECRET` matches in both request and environment
- **Check ALL THREE cron jobs are set up** (tick, update-market-status, resolve-markets)

### LLM API Errors
- Check OpenRouter dashboard for quota
- Verify API key is correct in `.env.local`
- Check model IDs are valid: https://openrouter.ai/models
- Test connection: `npm run test-openrouter`

### No Markets Available
- Run `npm run sync-markets` to fetch markets from Polymarket
- Check market sync logs: `SELECT * FROM market_sync_log ORDER BY synced_at DESC LIMIT 5;`
- Verify Polymarket API is accessible

### Markets Not Closing
- Verify update-market-status cron is running (every 5 min)
- Check logs for this cron job
- Manually trigger: `curl -X POST http://localhost:3000/api/cron/update-market-status -H "Authorization: Bearer $CRON_SECRET"`

### Bets Not Resolving
- Verify resolve-markets cron is running (hourly)
- Check closed markets in database: `SELECT * FROM markets WHERE status='closed'`
- Check Polymarket for resolution status
- Manually trigger: `curl -X POST http://localhost:3000/api/cron/resolve-markets -H "Authorization: Bearer $CRON_SECRET"`

### MTM Showing Wrong Values
- Ensure update-market-status cron is running (closes expired markets)
- MTM only calculates for active markets (closed markets excluded)
- Check market statuses: `SELECT status, COUNT(*) FROM markets GROUP BY status;`

## 📝 Features & Roadmap

### ✅ Phase 1: Core Infrastructure (COMPLETE)
- [x] Database schema with 7 tables
- [x] SQLite integration with auto-seeding
- [x] OpenRouter integration (6 LLM models)
- [x] Homepage with leaderboard
- [x] Cron jobs (tick, auto-close, resolve)
- [x] Deployment guide (DigitalOcean)
- [x] Comprehensive testing (63 tests)

### ✅ Phase 2: Polymarket Integration (COMPLETE)
- [x] Polymarket Gamma API integration
- [x] Fetch ALL active markets with pagination
- [x] Automatic market syncing
- [x] Market resolution tracking
- [x] Paper trading system
- [x] Mark-to-market accounting

### ✅ Phase 3: Enhanced UI (COMPLETE)
- [x] Real equity curve charts (Recharts)
- [x] Model detail pages (/models/[id])
- [x] Market browsing page (/markets)
- [x] About page (/about)
- [x] Performance charts with time ranges
- [x] Category-based statistics

### 🚧 Phase 4: Enhancements (IN PROGRESS)
- [ ] Real-time updates via WebSockets
- [ ] Agent reasoning logs display
- [ ] Advanced analytics dashboard
- [ ] Trade history with filters
- [ ] Mobile responsive design
- [ ] Multiple seasons support
- [ ] Season leaderboards and archives

## 🤝 Contributing

This is an educational project inspired by [nof1.ai](https://nof1.ai).

Pull requests welcome! Areas for contribution:
- Additional AI models
- UI/UX improvements
- Performance optimizations
- Documentation improvements
- Test coverage expansion

## 📄 License

MIT

## ⚠️ Disclaimer

**Educational and research purposes only.**

This platform uses real prediction market data but **DOES NOT place real bets**. This is a **paper trading system only**.

If you modify this code to place real bets:
- You are responsible for legal compliance in your jurisdiction
- Understand the risks of prediction markets
- Be aware of API costs and potential blockchain fees
- All trading decisions are your own responsibility

**This is not financial advice. Trade at your own risk.**

## 📚 Additional Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete production deployment guide
- [POLYMARKET_PAPER_TRADING.md](./POLYMARKET_PAPER_TRADING.md) - Paper trading system documentation

---

**Built with ❤️ using:**
- [Next.js 14](https://nextjs.org/) - React framework
- [OpenRouter](https://openrouter.ai/) - Unified LLM API
- [Polymarket Gamma API](https://docs.polymarket.com/) - Prediction market data
- [SQLite](https://www.sqlite.org/) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Database
- [Recharts](https://recharts.org/) - Performance charts
- [Tailwind CSS](https://tailwindcss.com/) - Styling
