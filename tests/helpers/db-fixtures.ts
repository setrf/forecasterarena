export async function createSingleAgentFixture() {
  const queries = await import('@/lib/db/queries');
  const dbModule = await import('@/lib/db');
  const db = dbModule.getDb();

  const firstModel = db.prepare(`
    SELECT id FROM models
    ORDER BY id ASC
    LIMIT 1
  `).get() as { id: string };

  db.prepare(`
    UPDATE models
    SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END
  `).run(firstModel.id);

  const cohort = queries.createCohort();
  const [agent] = queries.createAgentsForCohort(cohort.id);

  return {
    queries,
    dbModule,
    db,
    cohort,
    agent,
    modelId: firstModel.id
  };
}
