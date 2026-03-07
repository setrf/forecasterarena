import { MODELS } from '@/lib/constants';
import { createBackup, getDb, logSystemEvent } from '@/lib/db';
import { maybeStartNewCohort, checkAndCompleteCohorts } from '@/lib/engine/cohort';
import { syncMarkets } from '@/lib/engine/market';

export type AdminSeverityFilter = 'all' | 'info' | 'warning' | 'error';
export type AdminAction = 'start-cohort' | 'sync-markets' | 'check-cohorts' | 'backup';

type AdminActionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string };

export function getAdminStats() {
  const db = getDb();

  const activeCohorts = (db.prepare('SELECT COUNT(*) as count FROM cohorts WHERE status = ?')
    .get('active') as { count: number }).count;

  const totalAgents = (db.prepare('SELECT COUNT(*) as count FROM agents')
    .get() as { count: number }).count;

  const marketsTracked = (db.prepare('SELECT COUNT(*) as count FROM markets')
    .get() as { count: number }).count;

  const totalCost = (db.prepare('SELECT COALESCE(SUM(api_cost_usd), 0) as total FROM decisions')
    .get() as { total: number }).total;

  return {
    active_cohorts: activeCohorts,
    total_agents: totalAgents,
    markets_tracked: marketsTracked,
    total_api_cost: totalCost,
    updated_at: new Date().toISOString()
  };
}

export function getAdminCosts() {
  const db = getDb();

  const rawCosts = db.prepare(`
    SELECT
      m.id as model_id,
      m.display_name as model_name,
      m.color,
      COALESCE(SUM(d.api_cost_usd), 0) as total_cost,
      COALESCE(SUM(d.tokens_input), 0) as total_input_tokens,
      COALESCE(SUM(d.tokens_output), 0) as total_output_tokens,
      COUNT(d.id) as decision_count
    FROM models m
    LEFT JOIN agents a ON m.id = a.model_id
    LEFT JOIN decisions d ON a.id = d.agent_id
    GROUP BY m.id, m.display_name, m.color
    ORDER BY total_cost DESC
  `).all() as Array<{
    model_id: string;
    model_name: string;
    color: string;
    total_cost: number;
    total_input_tokens: number;
    total_output_tokens: number;
    decision_count: number;
  }>;

  const costsByModel = MODELS.map((model) => {
    const existing = rawCosts.find((cost) => cost.model_id === model.id);
    return existing || {
      model_id: model.id,
      model_name: model.displayName,
      color: model.color,
      total_cost: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      decision_count: 0
    };
  });

  const totalCost = costsByModel.reduce((sum, model) => sum + model.total_cost, 0);
  const totalInputTokens = costsByModel.reduce((sum, model) => sum + model.total_input_tokens, 0);
  const totalOutputTokens = costsByModel.reduce((sum, model) => sum + model.total_output_tokens, 0);
  const totalDecisions = costsByModel.reduce((sum, model) => sum + model.decision_count, 0);

  return {
    costs_by_model: costsByModel,
    summary: {
      total_cost: totalCost,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_decisions: totalDecisions,
      avg_cost_per_decision: totalDecisions > 0 ? totalCost / totalDecisions : 0
    },
    updated_at: new Date().toISOString()
  };
}

export function getAdminLogs(severity: AdminSeverityFilter, limit: number) {
  const db = getDb();
  let query = 'SELECT * FROM system_logs';
  const params: Array<string | number> = [];

  if (severity !== 'all') {
    query += ' WHERE severity = ?';
    params.push(severity);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  return {
    logs: db.prepare(query).all(...params),
    updated_at: new Date().toISOString()
  };
}

export async function runAdminAction(action: string, force: boolean): Promise<AdminActionResult> {
  try {
    switch (action as AdminAction) {
      case 'start-cohort': {
        const result = maybeStartNewCohort(force);

        if (result.success && result.cohort) {
          logSystemEvent('admin_start_cohort', {
            cohort_number: result.cohort.cohort_number,
            agents_created: result.agents?.length || 0
          }, 'info');

          return {
            ok: true,
            data: {
              success: true,
              cohort_id: result.cohort.id,
              cohort_number: result.cohort.cohort_number,
              agents_created: result.agents?.length || 0
            }
          };
        }

        return {
          ok: true,
          data: {
            success: false,
            message: result.error || 'Conditions not met for new cohort'
          }
        };
      }

      case 'sync-markets': {
        const result = await syncMarkets();
        logSystemEvent('admin_sync_markets', {
          markets_added: result.markets_added,
          markets_updated: result.markets_updated
        }, 'info');

        return {
          ok: true,
          data: {
            success: true,
            markets_added: result.markets_added,
            markets_updated: result.markets_updated
          }
        };
      }

      case 'check-cohorts': {
        const completedCount = checkAndCompleteCohorts();
        logSystemEvent('admin_check_cohorts', {
          cohorts_checked: completedCount
        }, 'info');

        return {
          ok: true,
          data: {
            success: true,
            cohorts_completed: completedCount
          }
        };
      }

      case 'backup': {
        const backupPath = createBackup();
        logSystemEvent('admin_backup', { backup_path: backupPath }, 'info');

        return {
          ok: true,
          data: {
            success: true,
            backup_path: backupPath
          }
        };
      }

      default:
        return { ok: false, status: 400, error: 'Unknown action' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logSystemEvent('admin_action_error', { error: message }, 'error');
    return { ok: false, status: 500, error: message };
  }
}
