import { generateId, getDb } from '../index';
import { INITIAL_BALANCE } from '../../constants';
import type { Agent, AgentWithModel } from '../../types';
import {
  getBenchmarkConfigModels,
  getDefaultBenchmarkConfig
} from './benchmark-configs';

type AgentIdentityRow = Record<string, unknown> & {
  identity_family_id: string | null;
  identity_family_slug: string | null;
  identity_legacy_model_id: string | null;
  identity_family_display_name: string | null;
  identity_short_display_name: string | null;
  identity_release_id: string | null;
  identity_release_name: string | null;
  identity_release_slug: string | null;
  identity_provider: string | null;
  identity_color: string | null;
  identity_openrouter_id: string | null;
  identity_input_price_per_million: number | null;
  identity_output_price_per_million: number | null;
  identity_benchmark_config_model_id: string | null;
};

export function getAgentsByCohort(cohortId: string): Agent[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM agents
    WHERE cohort_id = ?
    ORDER BY cash_balance DESC
  `).all(cohortId) as Agent[];
}

export function getAgentsWithModelsByCohort(cohortId: string): AgentWithModel[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      a.*,
      abi.family_id as identity_family_id,
      abi.family_slug as identity_family_slug,
      abi.legacy_model_id as identity_legacy_model_id,
      abi.family_display_name as identity_family_display_name,
      abi.short_display_name as identity_short_display_name,
      abi.release_id as identity_release_id,
      abi.release_display_name as identity_release_name,
      abi.release_slug as identity_release_slug,
      abi.provider as identity_provider,
      abi.color as identity_color,
      abi.openrouter_id as identity_openrouter_id,
      abi.input_price_per_million as identity_input_price_per_million,
      abi.output_price_per_million as identity_output_price_per_million,
      abi.benchmark_config_model_id as identity_benchmark_config_model_id
    FROM agents a
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    WHERE a.cohort_id = ?
    ORDER BY a.cash_balance DESC
  `).all(cohortId).map(row => {
    const r = row as AgentIdentityRow;
    const familyId = r.identity_family_id as string | null;
    const releaseId = r.identity_release_id as string | null;
    const benchmarkConfigModelId = r.identity_benchmark_config_model_id as string | null;

    if (!familyId || !releaseId || !benchmarkConfigModelId) {
      throw new Error(`Agent ${r.id as string} is missing frozen benchmark lineage`);
    }

    const legacyModelId = r.model_id as string;
    const displayName = r.identity_family_display_name as string;
    const familySlug = (r.identity_family_slug as string | null) ?? familyId;
    const releaseSlug = (r.identity_release_slug as string | null) ?? releaseId;

    return {
      id: r.id as string,
      cohort_id: r.cohort_id as string,
      model_id: r.model_id as string,
      family_id: familyId,
      release_id: releaseId,
      benchmark_config_model_id: benchmarkConfigModelId,
      cash_balance: r.cash_balance as number,
      total_invested: r.total_invested as number,
      status: r.status as 'active' | 'bankrupt',
      created_at: r.created_at as string,
      model: {
        id: familyId,
        legacy_model_id: legacyModelId,
        family_id: familyId,
        family_slug: familySlug,
        display_name: displayName,
        family_display_name: displayName,
        short_display_name: r.identity_short_display_name as string,
        release_id: releaseId,
        release_name: r.identity_release_name as string,
        release_slug: releaseSlug,
        openrouter_id: r.identity_openrouter_id as string,
        provider: r.identity_provider as string,
        color: r.identity_color as string | null,
        input_price_per_million: r.identity_input_price_per_million as number | null,
        output_price_per_million: r.identity_output_price_per_million as number | null,
        family: null,
        release: null,
        config_model: null
      }
    } as AgentWithModel;
  });
}

export function getAgentById(id: string): Agent | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined;
}

export function getAgentByCohortAndModel(
  cohortId: string,
  familySlugOrLegacyId: string
): Agent | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT a.*
    FROM agents a
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    WHERE a.cohort_id = ?
      AND (
        a.model_id = ?
        OR a.family_id = ?
        OR abi.family_slug = ?
        OR abi.legacy_model_id = ?
      )
    LIMIT 1
  `).get(
    cohortId,
    familySlugOrLegacyId,
    familySlugOrLegacyId,
    familySlugOrLegacyId,
    familySlugOrLegacyId
  ) as Agent | undefined;
}

export function createAgentsForCohort(cohortId: string, benchmarkConfigId?: string | null): Agent[] {
  const db = getDb();
  const configId = benchmarkConfigId ?? getDefaultBenchmarkConfig()?.id;
  if (!configId) {
    throw new Error('No default benchmark config is configured for agent creation');
  }

  const configModels = getBenchmarkConfigModels(configId);

  for (const configModel of configModels) {
    db.prepare(`
      INSERT OR IGNORE INTO agents (
        id,
        cohort_id,
        model_id,
        family_id,
        release_id,
        benchmark_config_model_id,
        cash_balance,
        total_invested,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active')
    `).run(
      generateId(),
      cohortId,
      configModel.legacy_model_id ?? configModel.family_id,
      configModel.family_id,
      configModel.release_id,
      configModel.id,
      INITIAL_BALANCE
    );
  }

  return getAgentsByCohort(cohortId);
}

export function updateAgentBalance(id: string, cashBalance: number, totalInvested: number): void {
  const db = getDb();
  const MIN_BET = 50;

  let status: 'active' | 'bankrupt';

  if (cashBalance <= 0 && totalInvested <= 0) {
    status = 'bankrupt';
  } else {
    status = 'active';
  }

  if (status === 'active' && cashBalance < MIN_BET && totalInvested > 0) {
    console.warn(
      `[Agent ${id}] Cannot afford minimum bet ($${MIN_BET}). ` +
      `Cash: $${cashBalance.toFixed(2)}, Invested: $${totalInvested.toFixed(2)}. ` +
      'Agent must wait for positions to resolve.'
    );
  }

  db.prepare(`
    UPDATE agents
    SET cash_balance = ?, total_invested = ?, status = ?
    WHERE id = ?
  `).run(cashBalance, totalInvested, status, id);
}

export function calculateActualPortfolioValue(agentId: string): number {
  const db = getDb();
  const agent = db.prepare(`
    SELECT cash_balance FROM agents WHERE id = ?
  `).get(agentId) as { cash_balance: number } | undefined;

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const positionValueResult = db.prepare(`
    SELECT COALESCE(SUM(COALESCE(current_value, total_cost)), 0) as total_position_value
    FROM positions
    WHERE agent_id = ? AND status = 'open'
  `).get(agentId) as { total_position_value: number };

  return agent.cash_balance + positionValueResult.total_position_value;
}
