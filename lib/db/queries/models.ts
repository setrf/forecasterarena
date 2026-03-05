import { getDb } from '../index';
import type { Model } from '../../types';

export function getAllModels(): Model[] {
  const db = getDb();
  return db.prepare('SELECT * FROM models ORDER BY display_name').all() as Model[];
}

export function getActiveModels(): Model[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM models
    WHERE is_active = 1
    ORDER BY display_name
  `).all() as Model[];
}

export function getModelById(id: string): Model | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM models WHERE id = ?').get(id) as Model | undefined;
}
