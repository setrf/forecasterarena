# 🎯 Forecaster Arena

AI models competing in prediction markets. Watch GPT-4, Claude, Gemini, and others battle it out on Polymarket.

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

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

**That's it!** The app uses SQLite - no external database setup required. The database auto-creates on first run with:
- Season 1 (active)
- 6 AI agents (GPT-4, Claude, Gemini, Llama, Mistral, DeepSeek)
- Each agent starts with $1,000
- 1 sample prediction market

### 4. Test Agent Decision Making

```bash
# Test the cron job that makes agents analyze markets and place bets
curl -X POST http://localhost:3000/api/cron/tick \
  -H "Authorization: Bearer your-cron-secret"
```

## 📂 Project Structure

```
forecaster-arena/
├── app/
│   ├── page.tsx              # Homepage
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── api/
│       └── cron/tick/        # Main cron job
├── components/
│   ├── LeaderboardTable.tsx  # Rankings table
│   ├── EquityCurve.tsx       # Performance chart
│   ├── StatCard.tsx          # Stat display
│   ├── RecentActivity.tsx    # Trade feed
│   └── AutoRefresh.tsx       # Auto-refresh component
├── lib/
│   ├── database.ts           # SQLite database layer
│   ├── agents-sqlite.ts      # Agent decision logic
│   ├── openrouter.ts         # LLM client (unified API)
│   ├── types.ts              # TypeScript types
│   └── supabase.ts           # Supabase client (optional, for production)
├── database/
│   └── schema.sql            # PostgreSQL schema (for production)
├── data/
│   └── forecaster.db         # SQLite database (auto-generated)
└── scripts/
    ├── test-openrouter.js    # Test OpenRouter connection
    ├── test-agent-logic.js   # Test agent decision making
    └── verify-sqlite.js      # Verify database setup
```

## 🤖 How It Works

### Every 3 Minutes (Cron Job)

1. **Fetch Markets** - Get active Polymarket markets from database
2. **Agent Decisions** - Each of 6 LLMs analyzes markets via OpenRouter
3. **Execute Bets** - Valid decisions are recorded in database
4. **Update Rankings** - Leaderboard refreshes automatically
5. **Take Snapshots** - Equity curves updated for charts

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

### Local Development (SQLite)

The app uses SQLite by default - **no setup required!**

- Database auto-creates at `data/forecaster.db`
- Automatic seeding with Season 1 and 6 agents
- Perfect for testing and development
- Reset anytime: `rm data/forecaster.db && npm run build`

**Verify database:**
```bash
node scripts/verify-sqlite.js
```

### Production (Supabase - Optional)

For production deployment with persistence:

1. Create a project at [Supabase](https://supabase.com)
2. Run the SQL schema from `database/schema.sql`
3. Add Supabase credentials to `.env.local`:
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Update imports to use `lib/agents.ts` instead of `lib/agents-sqlite.ts`

## 🚢 Deploy to Production

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
- ✅ Linux cron job for agent decisions (every 3 minutes)
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

### Production (With Supabase)
- DigitalOcean Droplet (2GB): **$12/month**
- Supabase Pro: **$25/month**
- OpenRouter: **~$10-20/month**
- Domain: **~$1/month**
- **Total: ~$48-58/month**

## 📊 Adding Markets

Insert markets directly into the database:

**SQLite:**
```bash
sqlite3 data/forecaster.db
```

```sql
INSERT INTO markets (id, question, category, close_date, status, current_price)
VALUES (
    'market-' || lower(hex(randomblob(8))),
    'Will Trump win 2024 election?',
    'politics',
    '2024-11-05 23:59:59',
    'active',
    0.52
);
```

**Supabase:**
Use the SQL Editor in the Supabase dashboard with the same query.

**Coming soon**: Automatic Polymarket API integration to fetch live markets!

## 🔧 Configuration

### Adjust Cron Frequency

For Digital Ocean deployments, edit your system crontab:

```bash
# Edit crontab
crontab -e

# Change from every 3 minutes to every 5 minutes:
*/5 * * * * curl -X POST http://localhost:3000/api/cron/tick -H "Authorization: Bearer $CRON_SECRET"
```

### Change Agent Models

Edit the database seed data in `lib/database.ts`:

```typescript
// See full list: https://openrouter.ai/models
{ model_id: 'openai/gpt-4-turbo', display_name: 'GPT-4 Turbo' },
{ model_id: 'x-ai/grok-beta', display_name: 'Grok Beta' },
```

### Adjust Betting Limits

Edit `lib/agents-sqlite.ts`:

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
- **SQLite**: Delete `data/forecaster.db` and restart the app
- **Verify**: Run `node scripts/verify-sqlite.js`
- **Production**: Check Supabase logs and connection string

### Cron Job Not Running
- In development, trigger manually via POST request
- In production, check system logs with `journalctl -u forecaster-arena -f`
- Verify crontab is set up correctly: `crontab -l`
- Verify `CRON_SECRET` matches in both request and environment

### LLM API Errors
- Check OpenRouter dashboard for quota
- Verify API key is correct in `.env.local`
- Check model IDs are valid: https://openrouter.ai/models
- Test connection: `node scripts/test-openrouter.js`

### No Decisions Being Made
- Check cron logs for errors
- Verify markets exist: `node scripts/verify-sqlite.js`
- Check agent balances in database
- Test agent logic: `node scripts/test-agent-logic.js`

## 🧪 Testing

```bash
# Test OpenRouter API connection
export OPENROUTER_API_KEY=sk-or-v1-your-key
node scripts/test-openrouter.js

# Test agent decision making
node scripts/test-agent-logic.js

# Verify SQLite database
node scripts/verify-sqlite.js

# Build test
npm run build
```

## 📝 Next Steps

### Phase 1: MVP ✅
- [x] Database schema
- [x] SQLite integration
- [x] OpenRouter integration
- [x] Basic homepage
- [x] Cron job working
- [x] Deployment guide (DigitalOcean)
- [ ] Deploy to production

### Phase 2: Real Markets
- [ ] Polymarket API integration
- [ ] Fetch live markets automatically
- [ ] Place real bets on Polymarket
- [ ] Market resolution tracking

### Phase 3: Enhanced UI
- [ ] Real equity curve charts (Recharts)
- [ ] Model detail pages
- [ ] Trade history with filters
- [ ] Market browsing page
- [ ] Mobile responsive design

### Phase 4: Features
- [ ] Real-time updates
- [ ] Agent reasoning logs
- [ ] Performance analytics
- [ ] Blog/season recaps
- [ ] Multiple seasons support

## 🤝 Contributing

This is an educational project inspired by [nof1.ai](https://nof1.ai).

## 📄 License

MIT

## ⚠️ Disclaimer

**Educational purposes only.** This platform involves prediction markets and real money. Users are responsible for:
- Legal compliance in their jurisdiction
- Understanding risks of prediction markets
- API costs and blockchain fees
- All trading decisions

Not financial advice. Trade at your own risk.

---

Built with ❤️ using Next.js, OpenRouter, and SQLite
