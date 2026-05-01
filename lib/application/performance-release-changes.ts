import { getDb } from '@/lib/db';

export interface ReleaseChangeEvent {
  date: string;
  model_id: string;
  model_name: string;
  previous_release_name: string;
  release_name: string;
  color: string;
}

export function getReleaseChangeEvents(args?: {
  cohortId?: string | null;
  familyId?: string | null;
}): ReleaseChangeEvent[] {
  const db = getDb();
  const params: Array<string> = [];
  let query = `
    SELECT
      MIN(d.decision_timestamp) as first_decision_at,
      COALESCE(dbi.family_slug, dbi.family_id, d.family_id) as model_id,
      COALESCE(dbi.family_display_name, dbi.release_display_name, a.model_id) as model_name,
      COALESCE(dbi.release_display_name, mr.release_name) as release_name,
      COALESCE(dbi.color, '#94A3B8') as color,
      COALESCE(dbi.release_id, d.release_id) as release_id
    FROM decisions d
    JOIN agents a ON a.id = d.agent_id
    JOIN cohorts c ON c.id = d.cohort_id
    LEFT JOIN decision_benchmark_identity_v dbi ON dbi.decision_id = d.id
    LEFT JOIN model_releases mr ON mr.id = d.release_id
    WHERE COALESCE(dbi.release_id, d.release_id) IS NOT NULL
  `;

  if (args?.cohortId) {
    query += ' AND d.cohort_id = ?';
    params.push(args.cohortId);
  }

  if (args?.familyId) {
    query += ' AND COALESCE(dbi.family_id, d.family_id) = ?';
    params.push(args.familyId);
  }

  if (!args?.cohortId) {
    query += ' AND COALESCE(c.is_archived, 0) = 0';
  }

  query += `
    GROUP BY
      COALESCE(dbi.family_slug, dbi.family_id, d.family_id),
      COALESCE(dbi.family_display_name, dbi.release_display_name, a.model_id),
      COALESCE(dbi.release_display_name, mr.release_name),
      COALESCE(dbi.color, '#94A3B8'),
      COALESCE(dbi.release_id, d.release_id)
    ORDER BY model_id ASC, first_decision_at ASC
  `;

  const rows = db.prepare(query).all(...params) as Array<{
    first_decision_at: string;
    model_id: string;
    model_name: string;
    release_name: string;
    color: string;
    release_id: string;
  }>;

  const latestByModel = new Map<string, string>();
  const latestReleaseNameByModel = new Map<string, string>();
  const events: ReleaseChangeEvent[] = [];

  for (const row of rows) {
    const previousReleaseId = latestByModel.get(row.model_id);
    if (!previousReleaseId) {
      latestByModel.set(row.model_id, row.release_id);
      latestReleaseNameByModel.set(row.model_id, row.release_name);
      continue;
    }

    if (previousReleaseId === row.release_id) {
      continue;
    }

    latestByModel.set(row.model_id, row.release_id);
    events.push({
      date: row.first_decision_at,
      model_id: row.model_id,
      model_name: row.model_name,
      previous_release_name: latestReleaseNameByModel.get(row.model_id) ?? row.model_name,
      release_name: row.release_name,
      color: row.color
    });
    latestReleaseNameByModel.set(row.model_id, row.release_name);
  }

  if (!args?.cohortId) {
    let currentQuery = `
      SELECT
        bc.created_at as config_created_at,
        COALESCE(mf.slug, mf.id) as model_id,
        mf.public_display_name as model_name,
        bcm.release_display_name_snapshot as release_name,
        COALESCE(bcm.color_snapshot, '#94A3B8') as color,
        bcm.release_id as release_id
      FROM benchmark_configs bc
      JOIN benchmark_config_models bcm ON bcm.benchmark_config_id = bc.id
      JOIN model_families mf ON mf.id = bcm.family_id
      WHERE bc.is_default_for_future_cohorts = 1
    `;
    const currentParams: Array<string> = [];

    if (args?.familyId) {
      currentQuery += ' AND bcm.family_id = ?';
      currentParams.push(args.familyId);
    }

    const currentRows = db.prepare(currentQuery).all(...currentParams) as Array<{
      config_created_at: string;
      model_id: string;
      model_name: string;
      release_name: string;
      color: string;
      release_id: string;
    }>;

    for (const row of currentRows) {
      const previousReleaseId = latestByModel.get(row.model_id);
      if (!previousReleaseId || previousReleaseId === row.release_id) {
        continue;
      }

      events.push({
        date: row.config_created_at,
        model_id: row.model_id,
        model_name: row.model_name,
        previous_release_name: latestReleaseNameByModel.get(row.model_id) ?? row.model_name,
        release_name: row.release_name,
        color: row.color
      });
      latestReleaseNameByModel.set(row.model_id, row.release_name);
    }
  }

  return events.sort((left, right) => left.date.localeCompare(right.date));
}
