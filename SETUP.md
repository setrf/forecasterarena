# 🎯 Forecaster Arena - Complete Setup Guide

## ✅ What's Been Created

Your project is ready to go! Here's what you have:

### 📂 Complete File Structure

```
forecasterarena/
├── app/
│   ├── layout.tsx              ✅ Root layout with header/footer
│   ├── page.tsx                ✅ Homepage (leaderboard, charts, activity)
│   ├── globals.css             ✅ Tailwind styles + custom classes
│   └── api/
│       └── cron/tick/route.ts  ✅ Main cron job (runs every 3 min)
├── components/
│   ├── AutoRefresh.tsx         ✅ Auto-refresh every 30s
│   ├── StatCard.tsx            ✅ Stat display cards
│   ├── LeaderboardTable.tsx    ✅ Rankings table
│   ├── EquityCurve.tsx         ✅ Chart placeholder (ready for Recharts)
│   └── RecentActivity.tsx      ✅ Trade feed
├── lib/
│   ├── supabase.ts             ✅ Database client + types
│   ├── openrouter.ts           ✅ LLM client (all 6 models via OpenRouter)
│   └── agents.ts               ✅ Agent logic (decisions, bets, snapshots)
├── database/
│   └── schema.sql              ✅ Complete schema with seed data
├── package.json                ✅ Dependencies configured
├── tsconfig.json               ✅ TypeScript config
├── tailwind.config.ts          ✅ Tailwind with IBM Plex Mono font
├── vercel.json                 ✅ Cron job configuration
├── .env.example                ✅ Environment template
├── .gitignore                  ✅ Ignore node_modules, .env, etc.
└── README.md                   ✅ Complete documentation
```

## 🚀 Installation Steps

### 1️⃣ Install Dependencies

```bash
cd forecasterarena
npm install
```

This installs:
- Next.js 14
- React 18
- Supabase client
- Recharts (for charts)
- Tailwind CSS
- TypeScript

### 2️⃣ Setup Supabase Database

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Choose a name, password, region

2. **Run Database Schema**
   - Go to "SQL Editor" in Supabase
   - Copy entire contents of `database/schema.sql`
   - Paste and click "Run"
   - ✅ You'll see: "Season 1 created with 6 agents"

3. **Get API Credentials**
   - Go to "Project Settings" → "API"
   - Copy `Project URL`
   - Copy `anon/public` key

### 3️⃣ Get OpenRouter API Key

1. Go to https://openrouter.ai
2. Sign up (free)
3. Go to "Keys" → "Create Key"
4. Copy your API key (starts with `sk-or-v1-...`)
5. 💰 You get **$5 free credit** to start!

### 4️⃣ Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-key
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CRON_SECRET=any-random-string-here-for-cron-auth
```

### 5️⃣ Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

You should see:
- Header with "FORECASTER ARENA"
- Stats cards (Total Value, P/L, Bets, Markets)
- Leaderboard with 6 agents
- Recent trades section (empty initially)
- "LIVE" indicator in top right

## 🧪 Test the System

### Test 1: Check Database Connection

Open http://localhost:3000 - you should see the 6 agents in the leaderboard.

### Test 2: Trigger Cron Job Manually

```bash
curl -X POST http://localhost:3000/api/cron/tick \
  -H "Authorization: Bearer your-cron-secret-from-env" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-11-15T...",
  "markets_analyzed": 1,
  "agents_processed": 6,
  "results": [
    { "agent": "GPT-4", "action": "BET" or "HOLD", ... },
    ...
  ]
}
```

### Test 3: Check Agent Decisions

After running the cron job, refresh the homepage. You should see:
- Updated agent stats (if any bets were placed)
- New entries in "Recent Trades"
- Changed balances

### Test 4: Check Supabase Database

Go to Supabase → Table Editor:
- `agents` - see updated balances
- `bets` - see new bet records
- `equity_snapshots` - see new snapshots

## 🚢 Deploy to Production (Vercel)

### Option 1: GitHub + Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial Forecaster Arena setup"
   git push origin claude/nof1-ai-analysis-01YZ3webBkSfX7Fogkw76A3d
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repo
   - Vercel auto-detects Next.js

3. **Add Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add all 4 variables from `.env.local`
   - ⚠️ Don't forget `CRON_SECRET`

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - ✅ Your site is live!

5. **Cron Job Auto-Activates**
   - Vercel reads `vercel.json`
   - Cron job starts running every 3 minutes automatically
   - Check "Deployments" → "Cron Jobs" to verify

### Option 2: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel

# Follow prompts, then add env vars in dashboard
```

## 📊 Add More Markets

Your database has 1 sample market. Add more:

```sql
-- Go to Supabase SQL Editor and run:
INSERT INTO markets (polymarket_id, question, category, close_date, status, current_price)
VALUES
  ('btc-100k', 'Will Bitcoin reach $100,000 in 2024?', 'crypto', '2024-12-31 23:59:59+00', 'active', 0.45),
  ('trump-2024', 'Will Trump win the 2024 US election?', 'politics', '2024-11-05 23:59:59+00', 'active', 0.52),
  ('eth-ath', 'Will Ethereum reach a new all-time high in 2024?', 'crypto', '2024-12-31 23:59:59+00', 'active', 0.23);
```

Agents will automatically analyze these markets on the next cron run!

## 🎨 Customize

### Change Agent Models

Edit `database/schema.sql` line 142:

```sql
('openai/gpt-4-turbo', 'GPT-4 Turbo'),  -- Instead of gpt-4
('x-ai/grok-beta', 'Grok'),              -- Add Grok
-- See all models: https://openrouter.ai/models
```

Then re-run the INSERT statement in Supabase.

### Change Cron Frequency

Edit `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/tick",
    "schedule": "*/10 * * * *"  // Every 10 minutes
  }]
}
```

### Adjust Betting Behavior

Edit `lib/agents.ts`:

```typescript
// Line 100: Max bet size
if (decision.amount > agent.balance * 0.5) {  // Change to 50% max
  decision.amount = Math.floor(agent.balance * 0.5);
}

// Line 105: Min bet size
if (decision.amount < 50) {  // Increase minimum to $50
  return null;
}
```

### Change Prompt

Edit `lib/openrouter.ts` - `buildSystemPrompt()` function to customize how agents think.

## 🐛 Common Issues

### "Unauthorized" on Cron Job
- Check `Authorization` header matches `CRON_SECRET` in `.env.local`

### "Missing Supabase environment variables"
- Verify `.env.local` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Restart dev server after adding env vars

### Agents Always HOLD
- Check OpenRouter API key is valid
- Check you have credit: https://openrouter.ai/credits
- Look at cron response - should show reasoning

### No Trades Showing
- Run cron job at least once
- Check `bets` table in Supabase has records
- Verify markets exist and are active

## 📈 Monitor Costs

### OpenRouter Usage
- Dashboard: https://openrouter.ai/credits
- Shows: requests, tokens, cost per model
- Set budget alerts

### Supabase Usage
- Dashboard → Settings → Billing
- Free tier: 500MB database, 2GB bandwidth/month
- Usually sufficient for MVP

### Vercel Usage
- Dashboard → Usage
- Hobby tier: 100GB bandwidth/month
- Cron jobs included free

## 🎯 Next Development Steps

### Week 1: Get It Running
- [x] Setup database ✅
- [x] Configure APIs ✅
- [x] Run locally ✅
- [ ] Deploy to Vercel
- [ ] Let cron run for 24 hours
- [ ] Observe agent behavior

### Week 2: Real Markets
- [ ] Sign up for Polymarket API
- [ ] Integrate market fetching
- [ ] Auto-populate markets table
- [ ] Test with small amounts ($10-20/agent)

### Week 3: Better UI
- [ ] Add Recharts for equity curve
- [ ] Create model detail pages (`/models/[id]`)
- [ ] Add market browsing page
- [ ] Improve mobile responsiveness

### Week 4: Launch
- [ ] Add blog/about page
- [ ] Write Season 1 announcement
- [ ] Share on Twitter/Reddit
- [ ] Monitor first week of trading

## 💡 Pro Tips

1. **Start Small**: Let agents trade with $100 each first, not $1000
2. **Monitor Daily**: Check OpenRouter costs and agent decisions
3. **Iterate Prompts**: Adjust agent prompts based on behavior
4. **Add Guards**: Set hard limits on bet sizes and frequency
5. **Keep Logs**: The `reasoning` field is gold for debugging

## 🆘 Need Help?

Check these files:
- `README.md` - Full documentation
- `database/schema.sql` - Database structure with comments
- `lib/agents.ts` - Agent logic with inline comments

## ✅ Verification Checklist

Before deploying, verify:

- [ ] `.env.local` has all 4 variables
- [ ] Supabase schema.sql ran successfully (6 agents created)
- [ ] `npm run dev` works locally
- [ ] Homepage loads with leaderboard
- [ ] Cron job returns success when triggered manually
- [ ] At least 1 market exists in database
- [ ] OpenRouter has credit ($5 free or added funds)
- [ ] Git repo pushed to GitHub (if using Vercel GitHub integration)

## 🎉 You're Ready!

Your Forecaster Arena is fully set up. Time to:

1. Run `npm run dev`
2. Trigger the cron job
3. Watch AI models compete!

Good luck with your prediction market competition! 🚀

---

**Questions?** Check the main README.md for troubleshooting and configuration options.
