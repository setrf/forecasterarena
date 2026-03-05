/**
 * Decision Engine
 * 
 * Orchestrates the weekly decision-making process for all LLMs.
 * This is the core loop that runs every Sunday at 00:00 UTC.
 * 
 * @module engine/decision
 */

import { getDb, logSystemEvent } from '../db';
import {
  getActiveCohorts,
  getAgentsWithModelsByCohort,
  getTopMarketsByVolume,
  getPositionsWithMarkets,
  createDecision,
  getDecisionByAgentWeek,
  getTradesByDecision
} from '../db/queries';
import { callOpenRouterWithRetry, estimateCost } from '../openrouter/client';
import { SYSTEM_PROMPT, buildUserPrompt, buildRetryPrompt } from '../openrouter/prompts';
import { parseDecision, isValidDecision, getDefaultHoldDecision } from '../openrouter/parser';
import { executeBets, executeSells } from './execution';
import { TOP_MARKETS_COUNT, LLM_MAX_RETRIES } from '../constants';
import { calculateWeekNumber } from '../utils';
import type { AgentWithModel, Market } from '../types';

/**
 * Result of processing a single agent's decision
 */
interface AgentDecisionResult {
  agent_id: string;
  model_id: string;
  decision_id: string;
  action: string;
  success: boolean;
  error?: string;
  trades_executed?: number;
}

/**
 * Result of processing all decisions for a cohort
 */
interface CohortDecisionResult {
  cohort_id: string;
  cohort_number: number;
  week_number: number;
  agents_processed: number;
  decisions: AgentDecisionResult[];
  errors: string[];
}

/**
 * Process a single agent's decision
 * 
 * @param agent - Agent with model info
 * @param cohortId - Cohort ID
 * @param weekNumber - Week number in cohort
 * @returns Decision result
 */
async function processAgentDecision(
  agent: AgentWithModel,
  cohortId: string,
  weekNumber: number,
  markets: Market[]
): Promise<AgentDecisionResult> {
  const result: AgentDecisionResult = {
    agent_id: agent.id,
    model_id: agent.model_id,
    decision_id: '',
    action: 'ERROR',
    success: false
  };
  
  try {
    // Skip bankrupt agents
    if (agent.status === 'bankrupt') {
      result.action = 'SKIPPED';
      result.success = true;
      return result;
    }

    // Idempotency guard: avoid duplicate decisions for rerun cron executions.
    // If last attempt for this week was an ERROR, allow a retry.
    // BET/SELL decisions that produced no trades are also retryable.
    const existingDecision = getDecisionByAgentWeek(agent.id, cohortId, weekNumber);
    if (existingDecision && existingDecision.action !== 'ERROR') {
      const shouldRetryWithoutTrades = (
        existingDecision.action === 'BET' || existingDecision.action === 'SELL'
      ) && getTradesByDecision(existingDecision.id).length === 0;

      if (!shouldRetryWithoutTrades) {
        result.decision_id = existingDecision.id;
        result.action = 'SKIPPED';
        result.success = true;
        return result;
      }

      result.decision_id = existingDecision.id;
      result.error = 'Retrying decision because no trades were recorded';
    }
    
    console.log(`Processing decision for ${agent.model.display_name}...`);
    
    // Get portfolio state
    const positions = getPositionsWithMarkets(agent.id);
    
    // Build prompts
    const systemPrompt = SYSTEM_PROMPT;
    const userPrompt = buildUserPrompt(
      {
        id: agent.id,
        cohort_id: agent.cohort_id,
        model_id: agent.model_id,
        cash_balance: agent.cash_balance,
        total_invested: agent.total_invested,
        status: agent.status,
        created_at: ''
      },
      positions.map(p => {
        // For binary positions, markets.current_price is the YES price.
        // Convert NO positions to side-correct price for the model prompt.
        const normalizedSide = p.side.toUpperCase();
        const yesPrice = p.current_price ?? 0.5;
        const currentPriceForPrompt = normalizedSide === 'NO' ? (1 - yesPrice) : yesPrice;

        return {
          id: p.id,
          market_question: p.market_question,
          side: p.side,
          shares: p.shares,
          avg_entry_price: p.avg_entry_price,
          current_price: currentPriceForPrompt,
          current_value: p.current_value || 0,
          unrealized_pnl: p.unrealized_pnl || 0
        };
      }),
      markets,
      weekNumber
    );
    
    // Call LLM
    let response = await callOpenRouterWithRetry(
      agent.model.openrouter_id,
      systemPrompt,
      userPrompt
    );
    
    let parsed = parseDecision(response.content, agent.cash_balance);
    let retryCount = 0;
    
    // Retry malformed responses up to configured max.
    while (!isValidDecision(parsed) && retryCount < LLM_MAX_RETRIES) {
      console.log(`Retrying ${agent.model.display_name} due to invalid response...`);
      
      const retryPrompt = buildRetryPrompt(
        userPrompt,
        response.content,
        parsed.error || 'Unknown error'
      );
      
      response = await callOpenRouterWithRetry(
        agent.model.openrouter_id,
        systemPrompt,
        retryPrompt
      );
      
      parsed = parseDecision(response.content, agent.cash_balance);
      retryCount++;
    }
    
    // Default to HOLD if still invalid
    if (!isValidDecision(parsed)) {
      console.log(`${agent.model.display_name} failed to produce valid response, defaulting to HOLD`);
      parsed = getDefaultHoldDecision(`Failed after ${retryCount} retries: ${parsed.error}`);
    }
    
    // Estimate cost
    const estimatedCost = estimateCost(response.usage, agent.model.openrouter_id);
    
    // Log decision
    const decision = createDecision({
      agent_id: agent.id,
      cohort_id: cohortId,
      decision_week: weekNumber,
      prompt_system: systemPrompt,
      prompt_user: userPrompt,
      raw_response: response.content,
      parsed_response: JSON.stringify(parsed),
      retry_count: retryCount,
      action: parsed.action,
      reasoning: parsed.reasoning,
      tokens_input: response.usage.prompt_tokens,
      tokens_output: response.usage.completion_tokens,
      api_cost_usd: estimatedCost,
      response_time_ms: response.response_time_ms
    });
    
    result.decision_id = decision.id;
    result.action = parsed.action;
    
    // Execute trades
    let tradesExecuted = 0;
    let executionErrors: string[] = [];
    let attemptedTrades = 0;
    
    if (parsed.action === 'BET' && parsed.bets) {
      const betResults = executeBets(agent.id, parsed.bets, decision.id);
      attemptedTrades = parsed.bets.length;
      tradesExecuted = betResults.filter(r => r.success).length;
      executionErrors = betResults
        .filter(r => !r.success && r.error)
        .map(r => r.error as string);
    } else if (parsed.action === 'SELL' && parsed.sells) {
      const sellResults = executeSells(agent.id, parsed.sells, decision.id);
      attemptedTrades = parsed.sells.length;
      tradesExecuted = sellResults.filter(r => r.success).length;
      executionErrors = sellResults
        .filter(r => !r.success && r.error)
        .map(r => r.error as string);
    }
    
    result.trades_executed = tradesExecuted;

    if (
      (parsed.action === 'BET' || parsed.action === 'SELL') &&
      attemptedTrades > 0 &&
      tradesExecuted === 0
    ) {
      result.success = false;
      result.error = executionErrors.join('; ') || `All ${parsed.action.toLowerCase()} executions failed`;

      logSystemEvent('agent_decision_execution_failed', {
        agent_id: agent.id,
        decision_id: decision.id,
        action: parsed.action,
        errors: executionErrors
      }, 'error');

      console.log(`${agent.model.display_name}: ${parsed.action} (0 trades, retryable failure)`);
      return result;
    }

    result.success = true;
    
    console.log(`${agent.model.display_name}: ${parsed.action} (${tradesExecuted} trades)`);
    
    return result;
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.error = message;
    
    logSystemEvent('agent_decision_error', {
      agent_id: agent.id,
      model_id: agent.model_id,
      error: message
    }, 'error');
    
    return result;
  }
}

/**
 * Run weekly decisions for a single cohort
 * 
 * @param cohortId - Cohort to process
 * @returns Cohort decision result
 */
export async function runCohortDecisions(cohortId: string): Promise<CohortDecisionResult> {
  const db = getDb();
  
  // Get cohort info
  const cohort = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(cohortId) as {
    id: string;
    cohort_number: number;
    started_at: string;
  };
  
  if (!cohort) {
    throw new Error(`Cohort not found: ${cohortId}`);
  }
  
  const weekNumber = calculateWeekNumber(cohort.started_at);
  
  console.log(`Running decisions for Cohort #${cohort.cohort_number}, Week ${weekNumber}`);
  
  const result: CohortDecisionResult = {
    cohort_id: cohortId,
    cohort_number: cohort.cohort_number,
    week_number: weekNumber,
    agents_processed: 0,
    decisions: [],
    errors: []
  };
  
  // Get all agents for this cohort
  const agents = getAgentsWithModelsByCohort(cohortId);
  const markets = getTopMarketsByVolume(TOP_MARKETS_COUNT);
  
  // Process each agent sequentially to avoid rate limits
  for (const agent of agents) {
    try {
      const decisionResult = await processAgentDecision(agent, cohortId, weekNumber, markets);
      result.decisions.push(decisionResult);
      result.agents_processed++;

      if (!decisionResult.success && decisionResult.error) {
        result.errors.push(`${agent.model.display_name}: ${decisionResult.error}`);
      }
      
      // Small delay between agents to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`${agent.model?.display_name}: ${message}`);
    }
  }
  
  logSystemEvent('cohort_decisions_complete', {
    cohort_id: cohortId,
    cohort_number: cohort.cohort_number,
    week_number: weekNumber,
    agents_processed: result.agents_processed,
    errors: result.errors.length
  });
  
  return result;
}

/**
 * Run weekly decisions for all active cohorts
 * 
 * This is the main entry point for the weekly cron job.
 * 
 * @returns Results for all cohorts
 */
export async function runAllDecisions(): Promise<CohortDecisionResult[]> {
  console.log('Starting weekly decision run...');
  
  const results: CohortDecisionResult[] = [];
  const activeCohorts = getActiveCohorts();
  
  if (activeCohorts.length === 0) {
    console.log('No active cohorts found');
    return results;
  }
  
  console.log(`Processing ${activeCohorts.length} active cohort(s)`);
  
  for (const cohort of activeCohorts) {
    try {
      const result = await runCohortDecisions(cohort.id);
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error processing cohort ${cohort.cohort_number}:`, message);
      
      logSystemEvent('cohort_decisions_error', {
        cohort_id: cohort.id,
        error: message
      }, 'error');
    }
  }
  
  console.log('Weekly decision run complete');
  
  return results;
}
