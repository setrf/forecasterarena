/**
 * Admin Export Endpoint
 *
 * Provides a small, bounded export (CSV+zip) of selected tables for a cohort
 * and time window. Designed to be light on the server: capped by date range,
 * row counts, and only accessible to authenticated admins.
 *
 * POST /api/admin/export
 *  - Body: { cohort_id: string, from: string, to: string, tables?: string[], include_prompts?: boolean }
 *  - Returns: { download_url, info }
 *
 * GET /api/admin/export?file=export-file.zip
 *  - Streams a previously generated export (admin-auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { logSystemEvent } from '@/lib/db';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

const MAX_DAYS = 7;
const MAX_ROWS = 50_000;
const DEFAULT_TABLES = ['cohorts', 'agents', 'models', 'markets', 'decisions', 'trades', 'positions', 'portfolio_snapshots'];
const EXPORTS_DIR = path.join(process.cwd(), 'backups', 'exports');

function ensureAuth() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

function parseDateInput(input: string, label: string): Date | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ${label} date`);
  }
  return d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(filePath: string, columns: string[], rows: Record<string, unknown>[]): void {
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  stream.write(columns.join(',') + '\n');
  for (const row of rows) {
    const line = columns.map((c) => csvEscape((row as any)[c])).join(',');
    stream.write(line + '\n');
  }
  stream.end();
}

function cleanupOldExports() {
  try {
    if (!fs.existsSync(EXPORTS_DIR)) return;
    const files = fs.readdirSync(EXPORTS_DIR)
      .filter((f) => f.endsWith('.zip'))
      .map((f) => ({ name: f, path: path.join(EXPORTS_DIR, f), mtime: fs.statSync(path.join(EXPORTS_DIR, f)).mtime }));

    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h
    for (const f of files) {
      if (f.mtime.getTime() < cutoff) {
        fs.unlinkSync(f.path);
      }
    }
  } catch (e) {
    console.warn('[Export] cleanup failed', e);
  }
}

function safeFilename(cohortId: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `export-${cohortId}-${ts}.zip`;
}

function buildQueries(includePrompts: boolean) {
  return {
    cohorts: {
      columns: ['id', 'cohort_number', 'started_at', 'status', 'completed_at', 'methodology_version', 'initial_balance', 'created_at'],
      sql: `SELECT ${[
        'id', 'cohort_number', 'started_at', 'status', 'completed_at', 'methodology_version', 'initial_balance', 'created_at'
      ].join(', ')} FROM cohorts WHERE id = ?`
    },
    agents: {
      columns: ['id', 'cohort_id', 'model_id', 'cash_balance', 'total_invested', 'status', 'created_at'],
      sql: `SELECT id, cohort_id, model_id, cash_balance, total_invested, status, created_at FROM agents WHERE cohort_id = ?`
    },
    models: {
      columns: ['id', 'openrouter_id', 'display_name', 'provider', 'color', 'is_active', 'added_at'],
      sql: `SELECT id, openrouter_id, display_name, provider, color, is_active, added_at FROM models WHERE id IN (SELECT DISTINCT model_id FROM agents WHERE cohort_id = ?)`
    },
    markets: {
      columns: ['id', 'polymarket_id', 'slug', 'event_slug', 'question', 'description', 'category', 'market_type', 'outcomes', 'close_date', 'status', 'current_price', 'current_prices', 'volume', 'liquidity', 'resolution_outcome', 'resolved_at', 'first_seen_at', 'last_updated_at'],
      sql: `SELECT DISTINCT m.id, m.polymarket_id, m.slug, m.event_slug, m.question, m.description, m.category, m.market_type, m.outcomes, m.close_date, m.status, m.current_price, m.current_prices, m.volume, m.liquidity, m.resolution_outcome, m.resolved_at, m.first_seen_at, m.last_updated_at
            FROM markets m
            WHERE m.id IN (
              SELECT DISTINCT p.market_id FROM positions p JOIN agents a ON p.agent_id = a.id WHERE a.cohort_id = ?
            )`
    },
    decisions: {
      columns: includePrompts
        ? ['id', 'agent_id', 'cohort_id', 'decision_week', 'decision_timestamp', 'prompt_system', 'prompt_user', 'raw_response', 'parsed_response', 'retry_count', 'action', 'reasoning', 'tokens_input', 'tokens_output', 'api_cost_usd', 'response_time_ms', 'error_message', 'created_at']
        : ['id', 'agent_id', 'cohort_id', 'decision_week', 'decision_timestamp', 'parsed_response', 'retry_count', 'action', 'reasoning', 'tokens_input', 'tokens_output', 'api_cost_usd', 'response_time_ms', 'error_message', 'created_at'],
      sql: `SELECT ${includePrompts
        ? 'id, agent_id, cohort_id, decision_week, decision_timestamp, prompt_system, prompt_user, raw_response, parsed_response, retry_count, action, reasoning, tokens_input, tokens_output, api_cost_usd, response_time_ms, error_message, created_at'
        : 'id, agent_id, cohort_id, decision_week, decision_timestamp, parsed_response, retry_count, action, reasoning, tokens_input, tokens_output, api_cost_usd, response_time_ms, error_message, created_at'}
            FROM decisions
            WHERE cohort_id = ?
              AND decision_timestamp >= ?
              AND decision_timestamp <= ?`
    },
    trades: {
      columns: ['id', 'agent_id', 'market_id', 'position_id', 'decision_id', 'trade_type', 'side', 'shares', 'price', 'total_amount', 'implied_confidence', 'cost_basis', 'realized_pnl', 'executed_at'],
      sql: `SELECT t.id, t.agent_id, t.market_id, t.position_id, t.decision_id, t.trade_type, t.side, t.shares, t.price, t.total_amount, t.implied_confidence, t.cost_basis, t.realized_pnl, t.executed_at
            FROM trades t
            JOIN agents a ON t.agent_id = a.id
            WHERE a.cohort_id = ?
              AND t.executed_at >= ?
              AND t.executed_at <= ?`
    },
    positions: {
      columns: ['id', 'agent_id', 'market_id', 'side', 'shares', 'avg_entry_price', 'total_cost', 'current_value', 'unrealized_pnl', 'status', 'opened_at', 'closed_at'],
      sql: `SELECT p.id, p.agent_id, p.market_id, p.side, p.shares, p.avg_entry_price, p.total_cost, p.current_value, p.unrealized_pnl, p.status, p.opened_at, p.closed_at
            FROM positions p
            JOIN agents a ON p.agent_id = a.id
            WHERE a.cohort_id = ?
              AND p.opened_at <= ?
              AND (p.closed_at IS NULL OR p.closed_at >= ?)`
    },
    portfolio_snapshots: {
      columns: ['id', 'agent_id', 'snapshot_timestamp', 'cash_balance', 'positions_value', 'total_value', 'total_pnl', 'total_pnl_percent', 'brier_score', 'num_resolved_bets', 'created_at'],
      sql: `SELECT s.id, s.agent_id, s.snapshot_timestamp, s.cash_balance, s.positions_value, s.total_value, s.total_pnl, s.total_pnl_percent, s.brier_score, s.num_resolved_bets, s.created_at
            FROM portfolio_snapshots s
            JOIN agents a ON s.agent_id = a.id
            WHERE a.cohort_id = ?
              AND s.snapshot_timestamp >= ?
              AND s.snapshot_timestamp <= ?`
    }
  };
}

async function handlePost(request: NextRequest) {
  const authResponse = ensureAuth();
  if (authResponse) return authResponse;

  const body = await request.json().catch(() => ({}));
  const cohortId = body.cohort_id as string;
  const fromInput = body.from as string;
  const toInput = body.to as string;
  const tablesInput = Array.isArray(body.tables) ? body.tables : undefined;
  const includePrompts = body.include_prompts === true;

  if (!cohortId || !fromInput || !toInput) {
    return NextResponse.json({ error: 'cohort_id, from, and to are required' }, { status: 400 });
  }

  let from: Date;
  let to: Date;
  try {
    from = parseDateInput(fromInput, 'from')!;
    to = parseDateInput(toInput, 'to')!;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid dates' }, { status: 400 });
  }

  if (to < from) {
    return NextResponse.json({ error: '`to` must be after `from`' }, { status: 400 });
  }

  if (daysBetween(from, to) > MAX_DAYS) {
    return NextResponse.json({ error: `Date range too large (max ${MAX_DAYS} days)` }, { status: 400 });
  }

  const tables = (tablesInput && tablesInput.length > 0 ? tablesInput : DEFAULT_TABLES)
    .filter((t) => DEFAULT_TABLES.includes(t));

  if (tables.length === 0) {
    return NextResponse.json({ error: 'No valid tables requested' }, { status: 400 });
  }

  // Ensure export directory exists and cleanup old files
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  cleanupOldExports();

  const db = getDb();
  const queries = buildQueries(includePrompts);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-export-'));
  const isoFrom = from.toISOString();
  const isoTo = to.toISOString();

  try {
    for (const table of tables) {
      const q = (queries as any)[table];
      if (!q) continue;

      let rows: any[] = [];
      switch (table) {
        case 'cohorts':
        case 'agents':
        case 'models':
          rows = db.prepare(q.sql).all(cohortId);
          break;
        case 'markets':
          rows = db.prepare(q.sql).all(cohortId);
          break;
        case 'decisions':
        case 'trades':
        case 'portfolio_snapshots':
          rows = db.prepare(q.sql).all(cohortId, isoFrom, isoTo);
          break;
        case 'positions':
          rows = db.prepare(q.sql).all(cohortId, isoTo, isoFrom);
          break;
        default:
          break;
      }

      if (rows.length > MAX_ROWS) {
        return NextResponse.json({ error: `${table} exceeds row cap (${MAX_ROWS}). Narrow the window.` }, { status: 400 });
      }

      const filePath = path.join(tempDir, `${table}.csv`);
      writeCsv(filePath, q.columns, rows);
    }

    const readme = [
      'Forecaster Arena Export',
      `Generated at: ${new Date().toISOString()}`,
      `Cohort: ${cohortId}`,
      `Range: ${isoFrom} .. ${isoTo}`,
      `Tables: ${tables.join(', ')}`,
      `Include prompts: ${includePrompts}`,
      `Schema version: ${process.env.SCHEMA_VERSION || 'unknown'}`,
      `Methodology version: ${process.env.METHODOLOGY_VERSION || 'v1'}`,
      '',
      'This export is capped to keep the server healthy (max 7 days, 50k rows per table).'
    ].join('\n');
    fs.writeFileSync(path.join(tempDir, 'README.txt'), readme, 'utf8');

    const filename = safeFilename(cohortId);
    const zipPath = path.join(EXPORTS_DIR, filename);

    // Zip the temp directory contents without nesting directories
    const filesToZip = fs.readdirSync(tempDir).map((f) => path.join(tempDir, f));
    execSync(`zip -j ${zipPath} ${filesToZip.map((f) => `"${f}"`).join(' ')}`);

    // Clean up temp dir
    for (const f of filesToZip) {
      fs.existsSync(f) && fs.unlinkSync(f);
    }
    fs.rmdirSync(tempDir);

    logSystemEvent('admin_export_created', {
      cohort_id: cohortId,
      tables,
      from: isoFrom,
      to: isoTo,
      include_prompts: includePrompts,
      file: filename
    }, 'info');

    return NextResponse.json({
      success: true,
      download_url: `/api/admin/export?file=${encodeURIComponent(filename)}`,
      info: {
        cohort_id: cohortId,
        from: isoFrom,
        to: isoTo,
        tables,
        include_prompts: includePrompts
      }
    });
  } catch (error: any) {
    console.error('[Export] failed', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}

async function handleGet(request: NextRequest) {
  const authResponse = ensureAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  if (!file) {
    return NextResponse.json({ error: 'file query param required' }, { status: 400 });
  }

  const safe = path.basename(file);
  const filePath = path.join(EXPORTS_DIR, safe);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  const res = new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safe}"`
    }
  });
  return res;
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}
