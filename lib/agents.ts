import { supabase, Agent, Market, Bet } from './supabase';
import { callLLM, buildSystemPrompt, buildUserPrompt, LLMDecision } from './openrouter';

/**
 * Get agent's decision for current markets
 */
export async function getAgentDecision(
  agent: Agent,
  markets: Market[]
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
  agent: Agent,
  decision: LLMDecision,
  market: Market
): Promise<Bet | null> {
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
    // 1. Insert bet record
    const { data: bet, error: betError } = await supabase
      .from('bets')
      .insert({
        agent_id: agent.id,
        market_id: market.id,
        side: decision.side,
        amount: decision.amount,
        price: market.current_price || 0.5,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        status: 'pending'
      })
      .select()
      .single();

    if (betError) throw betError;

    // 2. Update agent balance and stats
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        balance: agent.balance - decision.amount,
        total_bets: agent.total_bets + 1,
        pending_bets: agent.pending_bets + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id);

    if (updateError) throw updateError;

    console.log(`[${agent.display_name}] ✓ Bet placed: $${decision.amount} ${decision.side} on "${market.question}"`);

    return bet as Bet;
  } catch (error) {
    console.error(`[${agent.display_name}] Failed to execute bet:`, error);
    return null;
  }
}

/**
 * Take equity snapshot for all agents
 */
export async function takeEquitySnapshots(): Promise<void> {
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, balance, total_pl')
    .eq('status', 'active');

  if (error || !agents) {
    console.error('Failed to fetch agents for snapshots:', error);
    return;
  }

  const snapshots = agents.map(agent => ({
    agent_id: agent.id,
    balance: agent.balance,
    total_pl: agent.total_pl,
    timestamp: new Date().toISOString()
  }));

  const { error: insertError } = await supabase
    .from('equity_snapshots')
    .insert(snapshots);

  if (insertError) {
    console.error('Failed to insert equity snapshots:', insertError);
  } else {
    console.log(`✓ Equity snapshots saved for ${agents.length} agents`);
  }
}

/**
 * Get active markets (not closed or resolved)
 */
export async function getActiveMarkets(): Promise<Market[]> {
  const { data: markets, error } = await supabase
    .from('markets')
    .select('*')
    .eq('status', 'active')
    .gt('close_date', new Date().toISOString())
    .order('close_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch markets:', error);
    return [];
  }

  return markets as Market[];
}

/**
 * Get all active agents
 */
export async function getActiveAgents(): Promise<Agent[]> {
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .eq('status', 'active')
    .order('display_name');

  if (error) {
    console.error('Failed to fetch agents:', error);
    return [];
  }

  return agents as Agent[];
}

/**
 * Resolve a market and update all related bets
 */
export async function resolveMarket(
  marketId: string,
  winningOutcome: 'YES' | 'NO'
): Promise<void> {
  // 1. Get all pending bets for this market
  const { data: bets, error: betsError } = await supabase
    .from('bets')
    .select('*')
    .eq('market_id', marketId)
    .eq('status', 'pending');

  if (betsError || !bets) {
    console.error('Failed to fetch bets for resolution:', betsError);
    return;
  }

  // 2. Calculate P&L for each bet
  for (const bet of bets) {
    const won = bet.side === winningOutcome;
    const pnl = won ? bet.amount : -bet.amount; // Simple 1:1 payout for now
    const status = won ? 'won' : 'lost';

    // Update bet
    await supabase
      .from('bets')
      .update({
        status,
        pnl,
        resolved_at: new Date().toISOString()
      })
      .eq('id', bet.id);

    // Update agent stats
    const { data: agent } = await supabase
      .from('agents')
      .select('balance, total_pl, winning_bets, losing_bets, pending_bets')
      .eq('id', bet.agent_id)
      .single();

    if (agent) {
      await supabase
        .from('agents')
        .update({
          balance: won ? agent.balance + bet.amount * 2 : agent.balance, // Return stake + winnings
          total_pl: agent.total_pl + pnl,
          winning_bets: won ? agent.winning_bets + 1 : agent.winning_bets,
          losing_bets: won ? agent.losing_bets : agent.losing_bets + 1,
          pending_bets: agent.pending_bets - 1
        })
        .eq('id', bet.agent_id);
    }
  }

  // 3. Update market status
  await supabase
    .from('markets')
    .update({
      status: 'resolved',
      winning_outcome: winningOutcome,
      resolution_date: new Date().toISOString()
    })
    .eq('id', marketId);

  console.log(`✓ Market resolved: ${winningOutcome} wins (${bets.length} bets settled)`);
}
