import { seedScenarioMetadata } from './shared.mjs';

export function seedEmptyScenario(db) {
  seedScenarioMetadata(db, 'Empty-state e2e fixture');
}
