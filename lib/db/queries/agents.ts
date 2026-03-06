import { generateId, getDb } from '../index';
import { INITIAL_BALANCE } from '../../constants';
import type { Agent, AgentWithModel } from '../../types';
import { getActiveModels } from './models';

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
      m.id as model_id,
      m.openrouter_id as model_openrouter_id,
      m.display_name as model_display_name,
      m.provider as model_provider,
      m.color as model_color,
      m.is_active as model_is_active
    FROM agents a
    JOIN models m ON a.model_id = m.id
    WHERE a.cohort_id = ?
    ORDER BY a.cash_balance DESC
  `).all(cohortId).map(row => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      cohort_id: r.cohort_id as string,
      model_id: r.model_id as string,
      cash_balance: r.cash_balance as number,
      total_invested: r.total_invested as number,
      status: r.status as 'active' | 'bankrupt',
      created_at: r.created_at as string,
      model: {
        id: r.model_id as string,
        openrouter_id: r.model_openrouter_id as string,
        display_name: r.model_display_name as string,
        provider: r.model_provider as string,
        color: r.model_color as string | null,
        is_active: r.model_is_active as number,
        added_at: ''
      }
    } as AgentWithModel;
  });
}

export function getAgentById(id: string): Agent | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined;
}

export function getAgentByCohortAndModel(cohortId: string, modelId: string): Agent | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM agents
    WHERE cohort_id = ? AND model_id = ?
  `).get(cohortId, modelId) as Agent | undefined;
}

export function createAgentsForCohort(cohortId: string): Agent[] {
  const db = getDb();
  const models = getActiveModels();

  for (const model of models) {
    db.prepare(`
      INSERT OR IGNORE INTO agents (id, cohort_id, model_id, cash_balance, total_invested, status)
      VALUES (?, ?, ?, ?, 0, 'active')
    `).run(generateId(), cohortId, model.id, INITIAL_BALANCE);
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
