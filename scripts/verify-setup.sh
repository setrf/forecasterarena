#!/bin/bash

echo "🎯 Forecaster Arena - Setup Verification"
echo "========================================"
echo ""

# Check Node version
echo "📦 Node.js version:"
node --version
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✅ .env.local file found"

    # Check for required keys (without showing values)
    if grep -q "OPENROUTER_API_KEY=sk-or-v1-" .env.local; then
        echo "✅ OpenRouter API key configured"
    else
        echo "❌ OpenRouter API key missing or invalid"
    fi

    if grep -q "SUPABASE_URL=https://" .env.local; then
        echo "✅ Supabase URL configured"
    else
        echo "⚠️  Supabase URL not configured yet"
        echo "   👉 Get it from https://supabase.com → Project Settings → API"
    fi

    if grep -q "SUPABASE_ANON_KEY=eyJ" .env.local; then
        echo "✅ Supabase API key configured"
    else
        echo "⚠️  Supabase API key not configured yet"
        echo "   👉 Get it from https://supabase.com → Project Settings → API"
    fi
else
    echo "❌ .env.local file not found"
    echo "   👉 Run: cp .env.example .env.local"
fi

echo ""

# Check if node_modules exists
if [ -d node_modules ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Dependencies not installed"
    echo "   👉 Run: npm install"
fi

echo ""

# Check database schema file
if [ -f database/schema.sql ]; then
    echo "✅ Database schema file ready"
    echo "   👉 Run this in Supabase SQL Editor"
else
    echo "❌ Database schema file not found"
fi

echo ""
echo "========================================"
echo "Next Steps:"
echo ""
echo "1. Create Supabase project at https://supabase.com"
echo "2. Copy Project URL and anon key to .env.local"
echo "3. Run database/schema.sql in Supabase SQL Editor"
echo "4. Run: npm run dev"
echo "5. Open: http://localhost:3000"
echo ""
echo "Full guide: See SETUP.md"
echo "========================================"
