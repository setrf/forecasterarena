import { getDb } from '../index';
import type { ModelFamily } from '../../types';

export function getAllModelFamilies(): ModelFamily[] {
  const db = getDb();
  return db.prepare(`
    SELECT *
    FROM model_families
    ORDER BY sort_order ASC, public_display_name ASC
  `).all() as ModelFamily[];
}

export function getActiveModelFamilies(): ModelFamily[] {
  const db = getDb();
  return db.prepare(`
    SELECT *
    FROM model_families
    WHERE status = 'active'
    ORDER BY sort_order ASC, public_display_name ASC
  `).all() as ModelFamily[];
}

export function getModelFamilyById(id: string): ModelFamily | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM model_families WHERE id = ?').get(id) as ModelFamily | undefined;
}

export function getModelFamilyBySlug(slug: string): ModelFamily | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM model_families WHERE slug = ?').get(slug) as ModelFamily | undefined;
}

export function getModelFamilyByLegacyModelId(legacyModelId: string): ModelFamily | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT *
    FROM model_families
    WHERE legacy_model_id = ?
  `).get(legacyModelId) as ModelFamily | undefined;
}

export function resolveModelFamily(identifier: string): ModelFamily | undefined {
  return (
    getModelFamilyById(identifier) ||
    getModelFamilyBySlug(identifier) ||
    getModelFamilyByLegacyModelId(identifier)
  );
}
