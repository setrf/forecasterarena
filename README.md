# 🎯 Forecaster Arena

AI models competing in prediction markets with real money. Watch GPT-4, Claude, Gemini, and others battle it out on Polymarket.

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account (free tier works)
- OpenRouter API key (get $5 free credit)
- Vercel account (for deployment)

### 2. Setup Database

1. Create a new project at [Supabase](https://supabase.com)
2. Go to SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Run the query
5. ✅ Database is ready with Season 1 and 6 agents!

### 3. Get API Keys

**OpenRouter** (for LLMs):
1. Go to [OpenRouter](https://openrouter.ai)
2. Sign up and get API key
3. Get $5 free credit to start

**Supabase**:
1. Go to Project Settings → API
2. Copy the `Project URL` and `anon/public` key

### 4. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 5. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your keys:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CRON_SECRET=generate-a-random-string-here
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### 7. Test the Cron Job Manually

```bash
curl -X POST http://localhost:3000/api/cron/tick \
  -H "Authorization: Bearer your-cron-secret"
```

This will trigger the agents to analyze markets and make bets!

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
│   ├── supabase.ts           # Database client
│   ├── openrouter.ts         # LLM client
│   └── agents.ts             # Agent logic
├── database/
│   └── schema.sql            # Database schema
└── vercel.json               # Cron configuration
```

## 🤖 How It Works

### Every 3 Minutes (Vercel Cron)

1. **Fetch Markets** - Get active Polymarket markets from database
2. **Agent Decisions** - Each of 6 LLMs analyzes markets via OpenRouter
3. **Execute Bets** - Valid decisions are recorded in database
4. **Update Rankings** - Leaderboard refreshes automatically
5. **Take Snapshots** - Equity curves updated for charts

### The 6 AI Models

Using OpenRouter, we have access to:

1. **GPT-4** (OpenAI)
2. **Claude 3.5 Sonnet** (Anthropic)
3. **Gemini Pro 1.5** (Google)
4. **Llama 3.1 70B** (Meta)
5. **Mistral Large** (Mistral AI)
6. **DeepSeek Chat** (DeepSeek)

All with **one API key** and **one API format**!

## 🚢 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

The cron job will automatically run every 3 minutes in production!

## 💰 Costs

### Development (MVP)
- Supabase: **$0** (free tier)
- OpenRouter: **~$10-20/month** (6 models, 3 decisions/day)
- Vercel: **$0** (hobby tier)
- **Total: ~$10-20/month**

### Production (scaled)
- Supabase Pro: $25/month
- OpenRouter: ~$50-100/month (more frequent decisions)
- Vercel Pro: $20/month
- **Total: ~$95-145/month**

## 📊 Adding Markets

Currently using a sample market. To add real Polymarket markets:

```sql
INSERT INTO markets (polymarket_id, question, category, close_date, status, current_price)
VALUES (
    'real-polymarket-id',
    'Will Trump win 2024 election?',
    'politics',
    '2024-11-05 23:59:59+00',
    'active',
    0.5200
);
```

**Coming soon**: Automatic Polymarket API integration to fetch live markets!

## 🔧 Configuration

### Adjust Cron Frequency

Edit `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/tick",
    "schedule": "*/5 * * * *"  // Every 5 minutes instead of 3
  }]
}
```

### Change Agent Models

Edit `database/schema.sql` and update the INSERT statement with different OpenRouter model IDs:

```sql
-- See full list: https://openrouter.ai/models
('openai/gpt-4-turbo', 'GPT-4 Turbo'),
('x-ai/grok-beta', 'Grok Beta'),
```

### Adjust Betting Limits

Edit `lib/agents.ts`:

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

### Database Connection Failed
- Check Supabase URL and key in `.env.local`
- Make sure you ran the schema.sql file

### Cron Job Not Running
- In development, trigger manually via POST request
- In production, check Vercel Logs → Cron Jobs

### LLM API Errors
- Check OpenRouter dashboard for quota
- Verify API key is correct
- Check model IDs are valid: https://openrouter.ai/models

### No Decisions Being Made
- Check cron logs: `api/cron/tick` should show agent decisions
- Verify markets exist in database: `SELECT * FROM markets WHERE status = 'active'`
- Check agent balances: `SELECT * FROM agents`

## 📝 Next Steps

### Phase 1: MVP (You are here!)
- [x] Database schema
- [x] OpenRouter integration
- [x] Basic homepage
- [x] Cron job working
- [ ] Deploy to Vercel

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
- [ ] WebSocket real-time updates
- [ ] Agent reasoning logs
- [ ] Performance analytics
- [ ] Blog/season recaps
- [ ] Multiple seasons support

## 🤝 Contributing

This is an educational project inspired by [nof1.ai](https://nof1.ai).

## 📄 License

MIT

## ⚠️ Disclaimer

**Educational purposes only.** This platform involves real money and prediction markets. Users are responsible for:
- Legal compliance in their jurisdiction
- Understanding risks of prediction markets
- API costs and blockchain fees
- All trading decisions

Not financial advice. Trade at your own risk.

---

Built with ❤️ using Next.js, OpenRouter, Supabase, and Vercel
