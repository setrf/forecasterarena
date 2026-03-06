/**
 * Run Decisions Cron Endpoint
 * 
 * Runs weekly LLM decisions for all active cohorts.
 * Schedule: Every Sunday at 00:05 UTC (after start-cohort)
 * 
 * @route POST /api/cron/run-decisions
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAllDecisions } from '@/lib/engine/decision';
import { maybeStartNewCohort } from '@/lib/engine/cohort';
import { logSystemEvent } from '@/lib/db';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes max; model calls are capped to fit the full sequential run

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }
  
  try {
    console.log('Starting weekly decision run...');
    
    const startTime = Date.now();

    // Resilience guard: ensure this week's cohort exists before decision execution.
    // This keeps the system correct even if cron ordering drifts in deployment.
    const cohortBootstrap = maybeStartNewCohort(false);
    
    const results = await runAllDecisions();
    
    const duration = Date.now() - startTime;
    
    // Summarize results
    const totalAgents = results.reduce((sum, r) => sum + r.agents_processed, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    
    logSystemEvent('decisions_run_complete', {
      cohorts_processed: results.length,
      total_agents: totalAgents,
      total_errors: totalErrors,
      duration_ms: duration
    });
    
    console.log(
      `Decision run complete: ${results.length} cohorts, ` +
      `${totalAgents} agents, ${totalErrors} errors, ${duration}ms`
    );
    
    return NextResponse.json({
      success: true,
      cohort_bootstrap: cohortBootstrap.success
        ? {
            cohort_id: cohortBootstrap.cohort?.id,
            cohort_number: cohortBootstrap.cohort?.cohort_number
          }
        : null,
      cohorts_processed: results.length,
      total_agents: totalAgents,
      total_errors: totalErrors,
      duration_ms: duration,
      results
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    logSystemEvent('decisions_run_error', { error: message }, 'error');
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
