/**
 * Cohort Management
 * 
 * Handles the lifecycle of cohorts: creation, monitoring, and completion.
 * 
 * @module engine/cohort
 */

import { logSystemEvent } from '../db';
import {
  createCohort as dbCreateCohort,
  createAgentsForCohort,
  getActiveCohorts,
  getCohortById,
  completeCohort,
  getAgentsByCohort,
  getOpenPositions
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
    
    // Create cohort
    const cohort = dbCreateCohort();
    
    // Create agents for all models
    const agents = createAgentsForCohort(cohort.id);
    
    logSystemEvent('cohort_started', {
      cohort_id: cohort.id,
      cohort_number: cohort.cohort_number,
      num_agents: agents.length
    });
    
    console.log(`Cohort #${cohort.cohort_number} started with ${agents.length} agents`);
    
    return {
      success: true,
      cohort,
      agents
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
  const agents = getAgentsByCohort(cohortId);
  
  for (const agent of agents) {
    const openPositions = getOpenPositions(agent.id);
    if (openPositions.length > 0) {
      return false;
    }
  }
  
  return true;
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
  
  const agents = getAgentsByCohort(cohortId);
  
  let openPositions = 0;
  
  for (const agent of agents) {
    openPositions += getOpenPositions(agent.id).length;
  }
  
  return {
    cohort_id: cohort.id,
    cohort_number: cohort.cohort_number,
    num_agents: agents.length,
    active_agents: agents.filter(a => a.status === 'active').length,
    bankrupt_agents: agents.filter(a => a.status === 'bankrupt').length,
    open_positions: openPositions,
    total_trades: 0 // Would need to query trades table
  };
}

/**
 * Maybe start a new cohort (if conditions are met)
 * 
 * This is a safe wrapper that checks conditions before starting.
 * Used by the cron job to prevent duplicate cohorts.
 * 
 * @param force - Force start regardless of day
 * @returns Result
 */
export function maybeStartNewCohort(force: boolean = false): StartCohortResult {
  if (!force && !shouldStartNewCohort()) {
    return {
      success: false,
      error: 'Not Sunday or outside start window'
    };
  }
  
  return startNewCohort();
}

