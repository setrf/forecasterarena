import db, { queries } from './database';
import { callLLM, buildSystemPrompt, buildUserPrompt, LLMDecision } from './openrouter';
import {
  initializePolymarketClient,
  placePolymarketBet,
  isPolymarketConfigured
} from './polymarket';

/**
 * Get agent's decision for current markets
 */
export async function getAgentDecision(
  agent: any,
  markets: any[]
): Promise<LLMDecision & { agentId: string }> {
  console.log(`[${agent.display_name}] Analyzing ${markets.length} markets...`);

  const systemPrompt = buildSystemPrompt(agent.display_name);
  const userPrompt = buildUserPrompt(agent.balance, agent.total_bets, markets);

  const decision = await callLLM(agent.model_id, systemPrompt, userPrompt);

  console.log(`[${agent.display_name}] Decision: ${decision.action}`,
    decision.action === 'BET' ? `- ${decision.side} on market ${decision.marketId}` : '');

  return {
    ...decision,
    agentId: agent.id
  };
}

/**
 * Execute a bet (record in DB, update balance)
 */
export async function executeBet(
  agent: any,
  decision: LLMDecision,
  market: any
): Promise<any | null> {
  if (decision.action !== 'BET' || !decision.marketId || !decision.side || !decision.amount) {
    return null;
  }

  // Validation
  if (decision.amount > agent.balance) {
    console.warn(`[${agent.display_name}] Insufficient funds: ${decision.amount} > ${agent.balance}`);
    return null;
  }

  if (decision.amount < 10) {
    console.warn(`[${agent.display_name}] Bet too small: $${decision.amount}`);
    return null;
  }

  if (decision.amount > agent.balance * 0.3) {
    console.warn(`[${agent.display_name}] Bet too large (>30% of balance), capping`);
    decision.amount = Math.floor(agent.balance * 0.3);
  }

  try {
    const betId = `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert bet record
    queries.insertBet({
      id: betId,
      agent_id: agent.id,
      market_id: market.id,
      side: decision.side,
      amount: decision.amount,
      price: market.current_price || 0.5,
      confidence: decision.confidence,
      reasoning: decision.reasoning
    });

    // Update agent balance and stats
    queries.updateAgentBalance(
      agent.id,
      agent.balance - decision.amount,
      agent.total_bets + 1,
      agent.pending_bets + 1
    );

    console.log(`[${agent.display_name}] ✓ Bet placed: $${decision.amount} ${decision.side} on "${market.question}"`);

    // Place REAL bet on Polymarket (if enabled and configured)
    if (process.env.ENABLE_POLYMARKET === 'true' && isPolymarketConfigured()) {
      try {
        console.log(`[${agent.display_name}] 📊 Placing real bet on Polymarket...`);

        const client = await initializePolymarketClient();

        // Determine which token to buy based on decision
        const tokenId = decision.side === 'YES' ? market.yes_token_id : market.no_token_id;

        // Place the order on Polymarket
        const result = await placePolymarketBet(
          client,
          tokenId,
          'BUY',
          market.current_price || 0.5,
          decision.amount,
          market.tick_size || '0.001',
          market.neg_risk || false
        );

        if (result.success) {
          console.log(`[${agent.display_name}] ✅ Real bet placed on Polymarket!`);
          console.log(`   Order ID: ${result.orderID}`);

          // Store Polymarket order ID in bet record
          db.prepare('UPDATE bets SET polymarket_order_id = ? WHERE id = ?')
            .run(result.orderID, betId);
        } else {
          console.error(`[${agent.display_name}] ❌ Polymarket bet failed: ${result.error}`);
          console.log('   Continuing with simulation only');
        }
      } catch (polymarketError) {
        console.error(`[${agent.display_name}] ❌ Polymarket error:`, polymarketError);
        console.log('   Continuing with simulation only');
      }
    } else {
      // Simulation mode
      console.log(`[${agent.display_name}] 🎮 SIMULATION MODE - No real bet placed`);
      if (process.env.ENABLE_POLYMARKET !== 'true') {
        console.log('   Set ENABLE_POLYMARKET=true to enable real trading');
      }
    }

    return { id: betId };
  } catch (error) {
    console.error(`[${agent.display_name}] Failed to execute bet:`, error);
    return null;
  }
}

/**
 * Take equity snapshot for all agents
 */
export function takeEquitySnapshots(): void {
  const agents = queries.getActiveAgents();

  agents.forEach((agent: any) => {
    queries.insertSnapshot(agent.id, agent.balance, agent.total_pl);
  });

  console.log(`✓ Equity snapshots saved for ${agents.length} agents`);
}

/**
 * Get active markets (not closed or resolved)
 */
export function getActiveMarkets(): any[] {
  return queries.getActiveMarkets();
}

/**
 * Get all active agents
 */
export function getActiveAgents(): any[] {
  return queries.getActiveAgents();
}

/**
 * Resolve a market and update all related bets
 */
export function resolveMarket(
  marketId: string,
  winningOutcome: 'YES' | 'NO'
): void {
  // Get all pending bets for this market
  const bets = db.prepare('SELECT * FROM bets WHERE market_id = ? AND status = ?')
    .all(marketId, 'pending');

  bets.forEach((bet: any) => {
    const won = bet.side === winningOutcome;
    const pnl = won ? bet.amount : -bet.amount; // Simple 1:1 payout

    // Update bet
    db.prepare(`
      UPDATE bets
      SET status = ?, pnl = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(won ? 'won' : 'lost', pnl, bet.id);

    // Update agent stats
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(bet.agent_id) as any;

    if (agent) {
      db.prepare(`
        UPDATE agents
        SET
          balance = ?,
          total_pl = ?,
          winning_bets = ?,
          losing_bets = ?,
          pending_bets = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        won ? agent.balance + bet.amount * 2 : agent.balance,
        agent.total_pl + pnl,
        won ? agent.winning_bets + 1 : agent.winning_bets,
        won ? agent.losing_bets : agent.losing_bets + 1,
        agent.pending_bets - 1,
        agent.id
      );
    }
  });

  // Update market status
  db.prepare(`
    UPDATE markets
    SET status = ?, winning_outcome = ?, resolution_date = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run('resolved', winningOutcome, marketId);

  console.log(`✓ Market resolved: ${winningOutcome} wins (${bets.length} bets settled)`);
}
