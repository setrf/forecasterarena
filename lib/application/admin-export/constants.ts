import path from 'path';

export const MAX_DAYS = 7;
export const MAX_ROWS = 50_000;
export const ALL_EXPORT_TABLES = [
  'cohorts',
  'agents',
  'model_families',
  'model_releases',
  'benchmark_configs',
  'benchmark_config_models',
  'agent_benchmark_identity',
  'api_costs',
  'markets',
  'decisions',
  'trades',
  'positions',
  'portfolio_snapshots'
] as const;

export const DEFAULT_TABLES = [
  'cohorts',
  'agents',
  'model_families',
  'model_releases',
  'benchmark_configs',
  'benchmark_config_models',
  'agent_benchmark_identity',
  'api_costs',
  'markets',
  'decisions',
  'trades',
  'positions',
  'portfolio_snapshots'
] as const;

export type ExportTable = (typeof ALL_EXPORT_TABLES)[number];

export const EXPORTS_DIR = path.join(process.cwd(), 'backups', 'exports');
