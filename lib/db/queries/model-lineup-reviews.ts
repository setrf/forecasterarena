import { generateId, getDb } from '@/lib/db';

export type ModelLineupReviewStatus = 'open' | 'no_changes' | 'approved' | 'dismissed' | 'failed';

export interface ModelLineupReviewRecord {
  id: string;
  status: ModelLineupReviewStatus;
  checked_at: string;
  reviewed_at: string | null;
  target_config_id: string | null;
  candidate_lineup_json: string;
  catalog_summary_json: string;
  error_message: string | null;
  created_at: string;
}

export function createModelLineupReview(args: {
  status: ModelLineupReviewStatus;
  candidate_lineup_json: string;
  catalog_summary_json: string;
  error_message?: string | null;
  checked_at?: string;
}): ModelLineupReviewRecord {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO model_lineup_reviews (
      id,
      status,
      checked_at,
      candidate_lineup_json,
      catalog_summary_json,
      error_message
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    args.status,
    args.checked_at ?? new Date().toISOString(),
    args.candidate_lineup_json,
    args.catalog_summary_json,
    args.error_message ?? null
  );

  return getModelLineupReviewById(id)!;
}

export function getModelLineupReviewById(id: string): ModelLineupReviewRecord | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT *
    FROM model_lineup_reviews
    WHERE id = ?
    LIMIT 1
  `).get(id) as ModelLineupReviewRecord | undefined;
}

export function getLatestModelLineupReview(): ModelLineupReviewRecord | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT *
    FROM model_lineup_reviews
    ORDER BY checked_at DESC, created_at DESC
    LIMIT 1
  `).get() as ModelLineupReviewRecord | undefined;
}

export function approveModelLineupReview(id: string, targetConfigId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE model_lineup_reviews
    SET status = 'approved',
        reviewed_at = ?,
        target_config_id = ?
    WHERE id = ?
  `).run(new Date().toISOString(), targetConfigId, id);
}

export function dismissModelLineupReview(id: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE model_lineup_reviews
    SET status = 'dismissed',
        reviewed_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), id);
}
