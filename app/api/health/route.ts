/**
 * Health Check Endpoint
 * 
 * Returns system health status for monitoring.
 * 
 * @route GET /api/health
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};
  let overallStatus: 'ok' | 'error' = 'ok';
  
  // Database connectivity check
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as test').get() as { test: number };
    checks.database = {
      status: result.test === 1 ? 'ok' : 'error',
      message: result.test === 1 ? undefined : 'Database query failed'
    };
    if (checks.database.status === 'error') overallStatus = 'error';
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed'
    };
    overallStatus = 'error';
  }
  
  // Environment variables check
  const requiredEnvVars = ['OPENROUTER_API_KEY', 'CRON_SECRET', 'ADMIN_PASSWORD'];
  const missingEnvVars: string[] = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingEnvVars.push(envVar);
    }
  }
  
  checks.environment = {
    status: missingEnvVars.length === 0 ? 'ok' : 'error',
    message: missingEnvVars.length > 0 
      ? `Missing: ${missingEnvVars.join(', ')}` 
      : undefined
  };
  if (checks.environment.status === 'error') overallStatus = 'error';
  
  // Database integrity check (quick)
  try {
    const db = getDb();
    const orphanedPositions = db.prepare(`
      SELECT COUNT(*) as count 
      FROM positions p 
      LEFT JOIN agents a ON p.agent_id = a.id 
      WHERE a.id IS NULL
    `).get() as { count: number };
    
    checks.data_integrity = {
      status: orphanedPositions.count === 0 ? 'ok' : 'error',
      message: orphanedPositions.count > 0 
        ? `${orphanedPositions.count} orphaned positions found` 
        : undefined
    };
    if (checks.data_integrity.status === 'error') overallStatus = 'error';
  } catch (error) {
    checks.data_integrity = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Integrity check failed'
    };
  }
  
  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks
  }, {
    status: overallStatus === 'ok' ? 200 : 503
  });
}

