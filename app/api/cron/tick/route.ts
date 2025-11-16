import { NextResponse } from 'next/server';
import db, { getActiveAgents, getActiveMarkets, getAgentDecision, executeBet, sellBets, takeEquitySnapshots } from '@/lib/database';

/**
 * Main cron job - runs every 3 minutes
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 */
export async function GET(request: Request) {
  // Verify request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('===== CRON TICK START =====', new Date().toISOString());

  try {
    // 1. Fetch active markets
    const markets = getActiveMarkets();
    console.log(`Found ${markets.length} active markets`);

    if (markets.length === 0) {
      console.log('No active markets, skipping this tick');
      return NextResponse.json({
        success: true,
        message: 'No active markets',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Get all active agents
    const agents = getActiveAgents();
    console.log(`Found ${agents.length} active agents`);

    if (agents.length === 0) {
      console.log('No active agents');
      return NextResponse.json({
        success: true,
        message: 'No active agents',
        timestamp: new Date().toISOString()
      });
    }

    // 3. For each agent, get decision and execute action
    const results = [];
    for (const agent of agents) {
      try {
        // Get decision from LLM
        const decision = await getAgentDecision(agent, markets);

        // Log the decision
        const decisionId = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(`
          INSERT INTO agent_decisions (
            id, agent_id, action, reasoning, confidence,
            bets_to_sell, market_id, side, amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          decisionId,
          agent.id,
          decision.action,
          decision.reasoning || null,
          decision.confidence || null,
          decision.betsToSell ? JSON.stringify(decision.betsToSell) : null,
          decision.marketId || null,
          decision.side || null,
          decision.amount || null
        );

        // Execute sell action if decided to sell bets
        if (decision.action === 'SELL' && decision.betsToSell && decision.betsToSell.length > 0) {
          const sellResult = await sellBets(agent, decision.betsToSell);
          results.push({
            agent: agent.display_name,
            action: 'SELL',
            betsSold: sellResult.sold,
            totalPL: sellResult.totalPL,
            reasoning: decision.reasoning
          });
        }
        // Execute bet if decided to bet
        else if (decision.action === 'BET' && decision.marketId) {
          const market = markets.find(m => m.id === decision.marketId);
          if (market) {
            const bet = await executeBet(agent, decision, market);
            results.push({
              agent: agent.display_name,
              action: 'BET',
              market: market.question,
              side: decision.side,
              amount: decision.amount,
              success: !!bet
            });
          } else {
            console.warn(`Market ${decision.marketId} not found`);
            results.push({
              agent: agent.display_name,
              action: 'BET',
              error: 'Market not found'
            });
          }
        }
        // Hold - no action
        else {
          results.push({
            agent: agent.display_name,
            action: 'HOLD',
            reasoning: decision.reasoning
          });
        }
      } catch (error) {
        console.error(`Error processing agent ${agent.display_name}:`, error);
        results.push({
          agent: agent.display_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 4. Take equity snapshots
    takeEquitySnapshots();

    console.log('===== CRON TICK END =====');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      markets_analyzed: markets.length,
      agents_processed: agents.length,
      results
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
