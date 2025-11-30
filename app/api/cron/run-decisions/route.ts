/**
 * Run Decisions Cron Endpoint
 * 
 * Runs weekly LLM decisions for all active cohorts.
 * Schedule: Every Sunday at 00:00 UTC
 * 
 * @route POST /api/cron/run-decisions
 */

import { NextRequest, NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { runAllDecisions } from '@/lib/engine/decision';
import { logSystemEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for LLM calls

/**
 * Verify cron secret from request
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === CRON_SECRET;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    console.log('Starting weekly decision run...');
    
    const startTime = Date.now();
    
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

