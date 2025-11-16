import db, { queries } from './database';
import { callLLM, buildSystemPrompt, buildUserPrompt, LLMDecision } from './openrouter';

/**
 * Get agent's pending bets with mark-to-market information
 */
export function getAgentPendingBetsWithMTM(agentId: string): any[] {
  const bets = db.prepare(`
    SELECT
      b.id as bet_id,
      b.amount as bet_amount,
      b.price as entry_price,
      b.side,
      m.id as market_id,
      m.question as market_question,
      m.current_price
    FROM bets b
    JOIN markets m ON b.market_id = m.id
    WHERE b.agent_id = ? AND b.status = 'pending'
    ORDER BY b.placed_at DESC
  `).all(agentId) as any[];

  return bets.map(bet => {
    let currentValue = 0;
    if (bet.current_price && bet.entry_price) {
      if (bet.side === 'YES') {
        const shares = bet.bet_amount / bet.entry_price;
        currentValue = shares * bet.current_price;
      } else {
        const shares = bet.bet_amount / (1 - bet.entry_price);
        currentValue = shares * (1 - bet.current_price);
      }
    }
    const mtm_pnl = currentValue - bet.bet_amount;

    return {
      ...bet,
      current_value: currentValue,
      mtm_pnl
    };
  });
}

/**
 * Get agent's decision for current markets
 */
export async function getAgentDecision(
  agent: any,
  markets: any[]
): Promise<LLMDecision & { agentId: string }> {
  console.log(`[${agent.display_name}] Analyzing ${markets.length} markets...`);

  // Get agent's pending bets with MTM info
  const pendingBets = getAgentPendingBetsWithMTM(agent.id);
  console.log(`[${agent.display_name}] Has ${pendingBets.length} pending bets`);

  const systemPrompt = buildSystemPrompt(agent.display_name);
  const userPrompt = buildUserPrompt(agent.balance, agent.total_bets, markets, pendingBets);

  const decision = await callLLM(agent.model_id, systemPrompt, userPrompt);

  console.log(`[${agent.display_name}] Decision: ${decision.action}`,
    decision.action === 'BET' ? `- ${decision.side} on market ${decision.marketId}` :
    decision.action === 'SELL' ? `- Selling ${decision.betsToSell?.length || 0} bet(s)` : '');

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

    console.log(`[${agent.display_name}] ✓ Paper bet placed: $${decision.amount} ${decision.side} on "${market.question}"`);
    console.log(`   Price at entry: ${(market.current_price * 100).toFixed(1)}% | Confidence: ${decision.confidence || 'N/A'}`);

    return { id: betId };
  } catch (error) {
    console.error(`[${agent.display_name}] Failed to execute bet:`, error);
    return null;
  }
}

/**
 * Sell bets (realize MTM P/L and return cash to balance)
 * Wrapped in transaction for atomicity
 */
export async function sellBets(
  agent: any,
  betIds: string[]
): Promise<{ sold: number; totalPL: number }> {
  if (!betIds || betIds.length === 0) {
    return { sold: 0, totalPL: 0 };
  }

  let soldCount = 0;
  let totalPL = 0;

  // Start transaction
  db.prepare('BEGIN').run();

  try {
    for (const betId of betIds) {
      // Get bet with current market price
      const bet = db.prepare(`
        SELECT b.*, m.current_price
        FROM bets b
        JOIN markets m ON b.market_id = m.id
        WHERE b.id = ? AND b.agent_id = ? AND b.status = 'pending'
      `).get(betId, agent.id) as any;

      if (!bet) {
        console.warn(`[${agent.display_name}] Bet ${betId} not found or already closed`);
        continue;
      }

      // Calculate current value using MTM
      let currentValue = 0;
      if (bet.current_price && bet.price) {
        if (bet.side === 'YES') {
          const shares = bet.amount / bet.price;
          currentValue = shares * bet.current_price;
        } else {
          const shares = bet.amount / (1 - bet.price);
          currentValue = shares * (1 - bet.current_price);
        }
      }

      const pnl = currentValue - bet.amount;

      // Update bet status to "sold"
      db.prepare(`
        UPDATE bets
        SET status = 'sold', pnl = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(pnl, betId);

      // Return current value to agent's balance and update stats
      const newBalance = agent.balance + currentValue;
      const newTotalPL = agent.total_pl + pnl;

      // Determine if this was a winning or losing bet for stats
      const winCount = pnl > 0 ? agent.winning_bets + 1 : agent.winning_bets;
      const loseCount = pnl < 0 ? agent.losing_bets + 1 : agent.losing_bets;

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
        newBalance,
        newTotalPL,
        winCount,
        loseCount,
        agent.pending_bets - 1,
        agent.id
      );

      // Update agent object for next iteration
      agent.balance = newBalance;
      agent.total_pl = newTotalPL;
      agent.winning_bets = winCount;
      agent.losing_bets = loseCount;
      agent.pending_bets = agent.pending_bets - 1;

      soldCount++;
      totalPL += pnl;

      console.log(`[${agent.display_name}] ✓ Sold bet: ${bet.side} on market, P/L: $${pnl.toFixed(2)}`);
    }

    // Commit transaction
    db.prepare('COMMIT').run();

    if (soldCount > 0) {
      console.log(`[${agent.display_name}] ✓ Sold ${soldCount} bet(s), Total P/L: $${totalPL.toFixed(2)}`);
    }

    return { sold: soldCount, totalPL };
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    console.error(`[${agent.display_name}] Transaction failed, rolled back:`, error);
    throw error;
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
