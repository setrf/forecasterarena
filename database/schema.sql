-- FORECASTER ARENA DATABASE SCHEMA
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SEASONS TABLE
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    season_number INTEGER NOT NULL UNIQUE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    initial_bankroll DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AGENTS TABLE (6 LLM agents per season)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL, -- OpenRouter model ID (e.g., 'openai/gpt-4')
    display_name TEXT NOT NULL,
    balance DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    total_pl DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_bets INTEGER DEFAULT 0,
    winning_bets INTEGER DEFAULT 0,
    losing_bets INTEGER DEFAULT 0,
    pending_bets INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'eliminated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, model_id)
);

-- 3. MARKETS TABLE (Polymarket markets)
CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    polymarket_id TEXT UNIQUE,
    question TEXT NOT NULL,
    description TEXT,
    category TEXT,
    close_date TIMESTAMPTZ NOT NULL,
    resolution_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'resolved', 'cancelled')),
    current_price DECIMAL(5,4), -- YES probability (0.0000 to 1.0000)
    winning_outcome TEXT, -- 'YES' | 'NO' when resolved
    volume DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BETS TABLE (all trades by agents)
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    side TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    price DECIMAL(5,4) NOT NULL, -- odds at time of bet
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1), -- 0.00 to 1.00
    reasoning TEXT, -- LLM's explanation
    raw_response JSONB, -- Full LLM response for debugging
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cancelled', 'refunded')),
    pnl DECIMAL(10,2), -- profit/loss when resolved
    polymarket_order_id TEXT, -- actual order ID from Polymarket
    placed_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EQUITY SNAPSHOTS (for charts)
CREATE TABLE equity_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) NOT NULL,
    total_pl DECIMAL(10,2) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_agents_season ON agents(season_id);
CREATE INDEX idx_agents_balance ON agents(balance DESC);
CREATE INDEX idx_agents_pl ON agents(total_pl DESC);

CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_close_date ON markets(close_date);

CREATE INDEX idx_bets_agent ON bets(agent_id, placed_at DESC);
CREATE INDEX idx_bets_market ON bets(market_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_placed_at ON bets(placed_at DESC);

CREATE INDEX idx_snapshots_agent_time ON equity_snapshots(agent_id, timestamp DESC);

-- TRIGGER: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SEED DATA: Create Season 1 and 6 agents
INSERT INTO seasons (name, season_number, start_date, end_date, status)
VALUES (
    'Season 1',
    1,
    NOW(),
    NOW() + INTERVAL '90 days',
    'active'
);

-- Insert 6 agents for Season 1
INSERT INTO agents (season_id, model_id, display_name)
SELECT
    (SELECT id FROM seasons WHERE season_number = 1),
    model_id,
    display_name
FROM (VALUES
    ('openai/gpt-4', 'GPT-4'),
    ('anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet'),
    ('google/gemini-pro-1.5', 'Gemini Pro 1.5'),
    ('meta-llama/llama-3.1-70b-instruct', 'Llama 3.1 70B'),
    ('mistralai/mistral-large', 'Mistral Large'),
    ('deepseek/deepseek-chat', 'DeepSeek Chat')
) AS models(model_id, display_name);

-- Sample market (for testing)
INSERT INTO markets (polymarket_id, question, category, close_date, status, current_price)
VALUES (
    'sample-btc-market',
    'Will Bitcoin be above $100,000 by end of 2024?',
    'crypto',
    '2024-12-31 23:59:59+00',
    'active',
    0.4500
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Season 1 created with 6 agents.';
    RAISE NOTICE 'Sample market added.';
END $$;
