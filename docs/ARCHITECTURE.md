# System Architecture

This document describes the technical architecture of Forecaster Arena.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FORECASTER ARENA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │  Polymarket  │────▶│  Market Sync │────▶│   SQLite     │                │
│  │  Gamma API   │     │   Service    │     │   Database   │                │
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

## Components

### 1. Polymarket Integration (`lib/polymarket/`)

- **client.ts**: API client for Polymarket Gamma API
- **types.ts**: TypeScript types for API responses

Responsibilities:
- Fetch top 100 markets by volume
- Check market resolution status
- Transform API data to our schema

### 2. OpenRouter Integration (`lib/openrouter/`)

- **client.ts**: API client for OpenRouter
- **prompts.ts**: System and user prompt templates
- **parser.ts**: Response parsing and validation

Responsibilities:
- Call LLM APIs with temperature=0
- Handle rate limiting and retries
- Parse JSON responses
- Estimate API costs

### 3. Database Layer (`lib/db/`)

- **index.ts**: Database connection and initialization
- **schema.ts**: SQL schema definitions
- **queries.ts**: Query helpers for all operations

Responsibilities:
- Schema management
- CRUD operations for all entities
- Aggregate queries for leaderboard
- Backup functionality

### 4. Decision Engine (`lib/engine/`)

- **decision.ts**: Weekly decision orchestration
- **execution.ts**: Trade execution (BET/SELL)
- **cohort.ts**: Cohort lifecycle management
- **resolution.ts**: Market resolution and settlement

Responsibilities:
- Run weekly decision cycle
- Execute trades and update portfolios
- Manage cohort lifecycle
- Settle resolved positions

### 5. Scoring System (`lib/scoring/`)

- **brier.ts**: Brier score calculation
- **pnl.ts**: Profit/loss calculation

Responsibilities:
- Calculate implied confidence from bet size
- Compute Brier scores for resolved bets
- Track portfolio values and P/L

### 6. Frontend (`app/`)

- Next.js 14 App Router
- Server and client components
- API routes for data access

---

## Data Flow

### Weekly Decision Cycle (Sunday 00:00 UTC)

```
1. Start new cohort (if Sunday)
   └── Create cohort record
   └── Initialize agents for all models

2. For each active cohort:
   └── For each agent (LLM):
       ├── Fetch portfolio state
       ├── Fetch top 100 markets
       ├── Build prompts
       ├── Call OpenRouter API
       ├── Parse response (retry if needed)
       ├── Execute trades (BET/SELL/HOLD)
       └── Log decision with full reasoning

3. Check for market resolutions
   └── Settle positions
   └── Calculate Brier scores
```

### Daily Snapshot Cycle (00:00 UTC)

```
1. For each active cohort:
   └── For each agent:
       ├── Update position MTM values
       ├── Calculate portfolio totals
       └── Create snapshot record
```

### Hourly Resolution Check

```
1. Get all closed markets
2. For each market:
   ├── Check Polymarket for resolution
   ├── If resolved:
   │   ├── Update market record
   │   ├── Settle all positions
   │   └── Calculate Brier scores
   └── Check if cohort is complete
```

---

## API Routes

### Public Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/leaderboard` | GET | Aggregate leaderboard |
| `/api/models/[id]` | GET | Model performance data |
| `/api/cohorts/[id]` | GET | Cohort details |
| `/api/markets` | GET | Market list |

### Protected Endpoints (require CRON_SECRET)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/cron/sync-markets` | POST | Sync markets from Polymarket |
| `/api/cron/run-decisions` | POST | Run weekly LLM decisions |
| `/api/cron/start-cohort` | POST | Start new cohort |
| `/api/cron/check-resolutions` | POST | Check for resolved markets |
| `/api/cron/take-snapshots` | POST | Take portfolio snapshots |
| `/api/cron/backup` | POST | Create database backup |

### Admin Endpoints (require ADMIN_PASSWORD)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/login` | POST | Admin login |
| `/api/admin/login` | DELETE | Admin logout |

---

## Cron Schedule

```bash
# Sync markets every 6 hours
0 */6 * * * /api/cron/sync-markets

# Start new cohort every Sunday at 00:00 UTC
0 0 * * 0 /api/cron/start-cohort

# Run decisions every Sunday at 00:00 UTC
0 0 * * 0 /api/cron/run-decisions

# Check resolutions every hour
0 * * * * /api/cron/check-resolutions

# Take snapshots daily at 00:00 UTC
0 0 * * * /api/cron/take-snapshots

# Weekly backup Saturday 23:00 UTC
0 23 * * 6 /api/cron/backup
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | SQLite (better-sqlite3) |
| LLM API | OpenRouter |
| Market Data | Polymarket Gamma API |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Deployment | DigitalOcean VPS |

---

## File Structure

```
forecasterarena/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   ├── methodology/       # Methodology page
│   ├── models/            # Model pages
│   ├── cohorts/           # Cohort pages
│   ├── markets/           # Market pages
│   ├── about/             # About page
│   ├── admin/             # Admin dashboard
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Core logic
│   ├── db/               # Database layer
│   ├── polymarket/       # Polymarket API
│   ├── openrouter/       # LLM API
│   ├── engine/           # Decision engine
│   ├── scoring/          # Scoring system
│   ├── types.ts          # Type definitions
│   ├── constants.ts      # Configuration
│   └── utils.ts          # Utilities
├── docs/                  # Documentation
├── data/                  # Database files (gitignored)
└── backups/              # Backups (gitignored)
```

---

## Error Handling

### LLM Response Errors

1. If response is malformed JSON → Retry once
2. If still malformed → Default to HOLD
3. Log both attempts for analysis

### API Errors

1. Network errors → Retry with exponential backoff
2. Rate limits → Respect Retry-After header
3. Auth errors → Fail immediately, log error

### Database Errors

1. Transaction failures → Rollback
2. Constraint violations → Log and continue
3. Corruption → Restore from backup

---

## Security

### Authentication

- Cron endpoints require `CRON_SECRET` header
- Admin dashboard uses password authentication
- Session stored in HTTP-only cookie

### Data Protection

- No real money involved (paper trading only)
- API keys stored in environment variables
- Database file permissions restricted

### Rate Limiting

- OpenRouter handles rate limiting
- Polymarket API has generous limits
- We add delays between API calls



