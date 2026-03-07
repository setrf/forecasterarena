import { SEEDED_MODELS } from '../models.mjs';

export function seedEmptyScenario(db) {
  db.prepare(`
    INSERT INTO methodology_versions (version, title, description, effective_from_cohort)
    VALUES ('v1', 'Forecaster Arena Methodology v1', 'Empty-state e2e fixture', 1)
  `).run();

  const insertModel = db.prepare(`
    INSERT INTO models (id, openrouter_id, display_name, provider, color)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const model of SEEDED_MODELS) {
    insertModel.run(model.id, model.openrouterId, model.displayName, model.provider, model.color);
  }
}
