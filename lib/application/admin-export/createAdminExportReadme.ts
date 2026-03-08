import type { ExportTable } from '@/lib/application/admin-export/constants';

type CreateAdminExportReadmeInput = {
  cohortId: string;
  isoFrom: string;
  isoTo: string;
  tables: ExportTable[];
  includePrompts: boolean;
};

export function createAdminExportReadme(input: CreateAdminExportReadmeInput): string {
  const { cohortId, isoFrom, isoTo, tables, includePrompts } = input;

  return [
    'Forecaster Arena Export',
    `Generated at: ${new Date().toISOString()}`,
    `Cohort: ${cohortId}`,
    `Range: ${isoFrom} .. ${isoTo}`,
    `Tables: ${tables.join(', ')}`,
    `Include prompts: ${includePrompts}`,
    `Schema version: ${process.env.SCHEMA_VERSION || 'unknown'}`,
    `Methodology version: ${process.env.METHODOLOGY_VERSION || 'v1'}`,
    '',
    'This export is capped to keep the server healthy (max 7 days, 50k rows per table).',
    'Canonical benchmark identity lives in agent_benchmark_identity.csv plus the model_families/model_releases/benchmark_configs/benchmark_config_models tables.'
  ].join('\n');
}
