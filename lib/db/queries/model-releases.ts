import { getDb } from '../index';
import type { ModelRelease } from '../../types';

export function getModelReleaseById(id: string): ModelRelease | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM model_releases WHERE id = ?').get(id) as ModelRelease | undefined;
}

export function getModelReleasesByFamily(familyId: string): ModelRelease[] {
  const db = getDb();
  return db.prepare(`
    SELECT *
    FROM model_releases
    WHERE family_id = ?
    ORDER BY created_at DESC, release_name DESC
  `).all(familyId) as ModelRelease[];
}

export function getCurrentReleaseForFamily(familyId: string): ModelRelease | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT mr.*
    FROM benchmark_configs bc
    JOIN benchmark_config_models bcm ON bcm.benchmark_config_id = bc.id
    JOIN model_releases mr ON mr.id = bcm.release_id
    WHERE bc.is_default_for_future_cohorts = 1
      AND bcm.family_id = ?
    ORDER BY bc.created_at DESC
    LIMIT 1
  `).get(familyId) as ModelRelease | undefined;
}

export function createModelRelease(args: {
  id: string;
  family_id: string;
  release_name: string;
  release_slug: string;
  openrouter_id: string;
  provider: string;
  metadata_json?: string | null;
  release_status?: 'active' | 'deprecated' | 'retired';
}): ModelRelease {
  const db = getDb();

  db.prepare(`
    INSERT INTO model_releases (
      id,
      family_id,
      release_name,
      release_slug,
      openrouter_id,
      provider,
      metadata_json,
      release_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    args.id,
    args.family_id,
    args.release_name,
    args.release_slug,
    args.openrouter_id,
    args.provider,
    args.metadata_json ?? null,
    args.release_status ?? 'active'
  );

  return getModelReleaseById(args.id)!;
}
