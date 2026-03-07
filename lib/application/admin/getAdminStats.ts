import { getDb } from '@/lib/db';

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
