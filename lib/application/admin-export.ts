import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { getDb, logSystemEvent } from '@/lib/db';

const MAX_DAYS = 7;
const MAX_ROWS = 50_000;
const DEFAULT_TABLES = [
  'cohorts',
  'agents',
  'models',
  'markets',
  'decisions',
  'trades',
  'positions',
  'portfolio_snapshots'
] as const;
const EXPORTS_DIR = path.join(process.cwd(), 'backups', 'exports');

type ExportTable = (typeof DEFAULT_TABLES)[number];

type ExportQuery = {
  columns: string[];
  sql: string;
};

type ExportQueries = Record<ExportTable, ExportQuery>;

export type AdminExportInfo = {
  cohort_id: string;
  from: string;
  to: string;
  tables: ExportTable[];
  include_prompts: boolean;
};

type CreateAdminExportSuccess = {
  download_url: string;
  info: AdminExportInfo;
};

type DownloadAdminExportSuccess = {
  filePath: string;
  filename: string;
};

type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

function parseDateInput(input: string, label: string): Date {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} date`);
  }

  return date;
}

function daysBetween(from: Date, to: Date): number {
  return Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function writeCsv(filePath: string, columns: string[], rows: Record<string, unknown>[]): void {
  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))
  ];
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function cleanupOldExports(): void {
  try {
    if (!fs.existsSync(EXPORTS_DIR)) {
      return;
    }

    const files = fs.readdirSync(EXPORTS_DIR)
      .filter((file) => file.endsWith('.zip'))
      .map((file) => {
        const filePath = path.join(EXPORTS_DIR, file);
        return {
          path: filePath,
          mtime: fs.statSync(filePath).mtime
        };
      });

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    files.forEach((file) => {
      if (file.mtime.getTime() < cutoff) {
        fs.unlinkSync(file.path);
      }
    });
  } catch (error) {
    console.warn('[Export] cleanup failed', error);
  }
}

function safeFilename(cohortId: string): string {
  const safeCohortId = cohortId
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'cohort';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `export-${safeCohortId}-${timestamp}.zip`;
}

function createZipArchive(zipPath: string, files: string[]): void {
  const result = spawnSync('zip', ['-j', zipPath, ...files], {
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'Failed to create export archive');
  }
}

function cleanupTempDir(tempDir: string): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function buildQueries(includePrompts: boolean): ExportQueries {
  return {
    cohorts: {
      columns: ['id', 'cohort_number', 'started_at', 'status', 'completed_at', 'methodology_version', 'initial_balance', 'created_at'],
      sql: 'SELECT id, cohort_number, started_at, status, completed_at, methodology_version, initial_balance, created_at FROM cohorts WHERE id = ?'
    },
    agents: {
      columns: ['id', 'cohort_id', 'model_id', 'cash_balance', 'total_invested', 'status', 'created_at'],
      sql: 'SELECT id, cohort_id, model_id, cash_balance, total_invested, status, created_at FROM agents WHERE cohort_id = ?'
    },
    models: {
      columns: ['id', 'openrouter_id', 'display_name', 'provider', 'color', 'is_active', 'added_at'],
      sql: 'SELECT id, openrouter_id, display_name, provider, color, is_active, added_at FROM models WHERE id IN (SELECT DISTINCT model_id FROM agents WHERE cohort_id = ?)'
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

function getRequestedTables(input: unknown): ExportTable[] {
  const tables = Array.isArray(input) ? input : DEFAULT_TABLES;
  return tables.filter((table): table is ExportTable => {
    return typeof table === 'string' && DEFAULT_TABLES.includes(table as ExportTable);
  });
}

function getRowsForTable(
  queries: ExportQueries,
  table: ExportTable,
  cohortId: string,
  isoFrom: string,
  isoTo: string
): Record<string, unknown>[] {
  const query = queries[table];
  const db = getDb();

  switch (table) {
    case 'cohorts':
    case 'agents':
    case 'models':
    case 'markets':
      return db.prepare(query.sql).all(cohortId) as Record<string, unknown>[];
    case 'decisions':
    case 'trades':
    case 'portfolio_snapshots':
      return db.prepare(query.sql).all(cohortId, isoFrom, isoTo) as Record<string, unknown>[];
    case 'positions':
      return db.prepare(query.sql).all(cohortId, isoTo, isoFrom) as Record<string, unknown>[];
  }
}

function parseCreateExportInput(body: unknown): AppResult<{
  cohortId: string;
  from: Date;
  to: Date;
  tables: ExportTable[];
  includePrompts: boolean;
}> {
  const payload = (body && typeof body === 'object') ? body as Record<string, unknown> : {};
  const cohortId = typeof payload.cohort_id === 'string' ? payload.cohort_id : '';
  const fromInput = typeof payload.from === 'string' ? payload.from : '';
  const toInput = typeof payload.to === 'string' ? payload.to : '';
  const includePrompts = payload.include_prompts === true;

  if (!cohortId || !fromInput || !toInput) {
    return { ok: false, status: 400, error: 'cohort_id, from, and to are required' };
  }

  let from: Date;
  let to: Date;
  try {
    from = parseDateInput(fromInput, 'from');
    to = parseDateInput(toInput, 'to');
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : 'Invalid dates'
    };
  }

  if (to < from) {
    return { ok: false, status: 400, error: '`to` must be after `from`' };
  }

  if (daysBetween(from, to) > MAX_DAYS) {
    return { ok: false, status: 400, error: `Date range too large (max ${MAX_DAYS} days)` };
  }

  const tables = getRequestedTables(payload.tables);
  if (tables.length === 0) {
    return { ok: false, status: 400, error: 'No valid tables requested' };
  }

  return {
    ok: true,
    data: { cohortId, from, to, tables, includePrompts }
  };
}

export function createAdminExport(body: unknown): AppResult<CreateAdminExportSuccess> {
  const parsed = parseCreateExportInput(body);
  if (!parsed.ok) {
    return parsed;
  }

  const { cohortId, from, to, tables, includePrompts } = parsed.data;
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  cleanupOldExports();

  const queries = buildQueries(includePrompts);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-export-'));
  const isoFrom = from.toISOString();
  const isoTo = to.toISOString();

  try {
    tables.forEach((table: ExportTable) => {
      const rows = getRowsForTable(queries, table, cohortId, isoFrom, isoTo);
      if (rows.length > MAX_ROWS) {
        throw new Error(`${table} exceeds row cap (${MAX_ROWS}). Narrow the window.`);
      }

      writeCsv(path.join(tempDir, `${table}.csv`), queries[table].columns, rows);
    });

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

    const filename = path.basename(safeFilename(cohortId));
    const zipPath = path.join(EXPORTS_DIR, filename);
    const filesToZip = fs.readdirSync(tempDir).map((file) => path.join(tempDir, file));

    createZipArchive(zipPath, filesToZip);
    logSystemEvent('admin_export_created', {
      cohort_id: cohortId,
      tables,
      from: isoFrom,
      to: isoTo,
      include_prompts: includePrompts,
      file: filename
    }, 'info');

    return {
      ok: true,
      data: {
        download_url: `/api/admin/export?file=${encodeURIComponent(filename)}`,
        info: {
          cohort_id: cohortId,
          from: isoFrom,
          to: isoTo,
          tables,
          include_prompts: includePrompts
        }
      }
    };
  } catch (error) {
    console.error('[Export] failed', error);
    const message = error instanceof Error ? error.message : 'Export failed';
    const status = message.includes('row cap') ? 400 : 500;
    return { ok: false, status, error: message };
  } finally {
    cleanupTempDir(tempDir);
  }
}

export function resolveAdminExportDownload(file: string | null): AppResult<DownloadAdminExportSuccess> {
  if (!file) {
    return { ok: false, status: 400, error: 'file query param required' };
  }

  const filename = path.basename(file);
  const filePath = path.join(EXPORTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return { ok: false, status: 404, error: 'Not found' };
  }

  return {
    ok: true,
    data: { filePath, filename }
  };
}
