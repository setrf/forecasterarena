/**
 * Cohort Management
 * 
 * Handles the lifecycle of cohorts: creation, monitoring, and completion.
 * 
 * @module engine/cohort
 */

import { getDb, logSystemEvent, withTransaction } from '../db';
import {
  createCohort as dbCreateCohort,
  createAgentsForCohort,
  getActiveCohorts,
  getCohortById,
  completeCohort,
  getAgentsByCohort,
  getOpenPositions,
  getTotalDecisionsForCohort,
  getCohortCompletionStatus,
  getCohortForCurrentWeek
} from '../db/queries';
import type { Cohort, Agent } from '../types';

/**
 * Result of starting a new cohort
 */
export interface StartCohortResult {
  success: boolean;
  cohort?: Cohort;
  agents?: Agent[];
  error?: string;
}

/**
 * Check if a new cohort should be started
 * 
 * A new cohort is started every Sunday at 00:00 UTC.
 * This function checks if it's currently Sunday.
 * 
 * @returns True if it's Sunday
 */
export function shouldStartNewCohort(): boolean {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const hour = now.getUTCHours();
  
  // Start on Sunday, within the first hour (to allow for cron timing)
  return dayOfWeek === 0 && hour < 1;
}

/**
 * Start a new cohort
 * 
 * Creates a new cohort and initializes agents for all active models.
 * 
 * @returns Result of starting the cohort
 */
export function startNewCohort(): StartCohortResult {
  try {
    console.log('Starting new cohort...');

    // Wrap cohort and agent creation in a transaction for atomicity
    const result = withTransaction(() => {
      // Create cohort
      const cohort = dbCreateCohort();
      const existingAgents = getAgentsByCohort(cohort.id);

      // Create agents for all models if this cohort was newly created.
      const agents = existingAgents.length > 0
        ? existingAgents
        : createAgentsForCohort(cohort.id);

      if (existingAgents.length === 0) {
        logSystemEvent('cohort_started', {
          cohort_id: cohort.id,
          cohort_number: cohort.cohort_number,
          num_agents: agents.length
        });
      }

      return { cohort, agents };
    });

    console.log(`Cohort #${result.cohort.cohort_number} started with ${result.agents.length} agents`);

    return {
      success: true,
      cohort: result.cohort,
      agents: result.agents
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logSystemEvent('cohort_start_error', { error: message }, 'error');

    return {
      success: false,
      error: message
    };
  }
}

/**
 * Check if a cohort is complete
 * 
 * A cohort is complete when all positions are settled
 * (all markets that agents bet on have resolved).
 * 
 * @param cohortId - Cohort to check
 * @returns True if all positions are settled
 */
export function isCohortComplete(cohortId: string): boolean {
  // Use optimized single query instead of N+1 pattern
  const status = getCohortCompletionStatus(cohortId);

  // A cohort with no trades shouldn't be auto-completed
  if (status.total_decisions === 0) {
    return false;
  }

  // Cohort is complete when all positions are settled (no open positions)
  return status.open_positions === 0;
}

/**
 * Check and complete cohorts that are done
 * 
 * Scans all active cohorts and marks any that are complete.
 * 
 * @returns Number of cohorts completed
 */
export function checkAndCompleteCohorts(): number {
  const activeCohorts = getActiveCohorts();
  let completedCount = 0;
  
  for (const cohort of activeCohorts) {
    if (isCohortComplete(cohort.id)) {
      completeCohort(cohort.id);
      completedCount++;
      
      logSystemEvent('cohort_completed', {
        cohort_id: cohort.id,
        cohort_number: cohort.cohort_number
      });
      
      console.log(`Cohort #${cohort.cohort_number} completed`);
    }
  }
  
  return completedCount;
}

/**
 * Get cohort summary statistics
 *
 * Uses single-query approach to avoid N+1 queries.
 *
 * @param cohortId - Cohort to summarize
 * @returns Summary object
 */
export function getCohortStats(cohortId: string): {
  cohort_id: string;
  cohort_number: number;
  num_agents: number;
  active_agents: number;
  bankrupt_agents: number;
  open_positions: number;
  total_trades: number;
} | null {
  const cohort = getCohortById(cohortId);
  if (!cohort) return null;

  const db = getDb();
  const agents = getAgentsByCohort(cohortId);

  // Use optimized single-query function instead of N+1 pattern
  const completionStatus = getCohortCompletionStatus(cohortId);
  const tradeCount = (db.prepare(`
    SELECT COUNT(*) as count
    FROM trades t
    JOIN agents a ON t.agent_id = a.id
    WHERE a.cohort_id = ?
  `).get(cohortId) as { count: number }).count;

  return {
    cohort_id: cohort.id,
    cohort_number: cohort.cohort_number,
    num_agents: agents.length,
    active_agents: agents.filter(a => a.status === 'active').length,
    bankrupt_agents: agents.filter(a => a.status === 'bankrupt').length,
    open_positions: completionStatus.open_positions,
    total_trades: tradeCount
  };
}

/**
 * Maybe start a new cohort (if conditions are met)
 *
 * This is a safe wrapper that checks conditions before starting.
 * Used by the cron job to prevent duplicate cohorts.
 *
 * Idempotency: If a cohort already exists for this week, returns it instead of creating a new one.
 *
 * @param force - Force start regardless of day
 * @returns Result
 */
export function maybeStartNewCohort(force: boolean = false): StartCohortResult {
  // Check for existing cohort this week (idempotency check)
  const existingCohort = getCohortForCurrentWeek();
  if (existingCohort) {
    console.log(`Cohort #${existingCohort.cohort_number} already exists for this week`);
    const agents = getAgentsByCohort(existingCohort.id);
    return {
      success: true,
      cohort: existingCohort,
      agents
    };
  }

  if (!force && !shouldStartNewCohort()) {
    return {
      success: false,
      error: 'Not Sunday or outside start window'
    };
  }

  return startNewCohort();
}

