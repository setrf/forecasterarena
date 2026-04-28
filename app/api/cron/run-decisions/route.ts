/**
 * Run Decisions Cron Endpoint
 * 
 * Runs weekly LLM decisions for decision-eligible active cohorts.
 * Schedule: Every Sunday at 00:05 UTC (after start-cohort)
 * 
 * @route POST /api/cron/run-decisions
 */

import { NextRequest } from 'next/server';
import { runDecisions } from '@/lib/application/cron';
import { cronResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes max; model calls are capped to fit the full sequential run

export async function POST(request: NextRequest) {
  return cronResultJson(request, runDecisions);
}
