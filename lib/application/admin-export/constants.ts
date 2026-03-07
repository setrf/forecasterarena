import path from 'path';

export const MAX_DAYS = 7;
export const MAX_ROWS = 50_000;
export const DEFAULT_TABLES = [
  'cohorts',
  'agents',
  'models',
  'markets',
  'decisions',
  'trades',
  'positions',
  'portfolio_snapshots'
] as const;

export type ExportTable = (typeof DEFAULT_TABLES)[number];

export const EXPORTS_DIR = path.join(process.cwd(), 'backups', 'exports');
