import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

type EnvOverrides = Record<string, string | undefined>;

export interface IsolatedTestContext {
  tempDir: string;
  dbPath: string;
  cleanup: () => Promise<void>;
}

interface ContextOptions {
  nodeEnv?: string;
  env?: EnvOverrides;
}

const BASE_ENV_KEYS = [
  'DATABASE_PATH',
  'NODE_ENV',
  'CRON_SECRET',
  'ADMIN_PASSWORD',
  'OPENROUTER_API_KEY'
];

export async function createIsolatedTestContext(
  options: ContextOptions = {}
): Promise<IsolatedTestContext> {
  const managedKeys = new Set(BASE_ENV_KEYS);
  if (options.env) {
    for (const key of Object.keys(options.env)) {
      managedKeys.add(key);
    }
  }

  const previousValues = new Map<string, string | undefined>();
  const mutableEnv = process.env as Record<string, string | undefined>;

  for (const key of Array.from(managedKeys)) {
    previousValues.set(key, process.env[key]);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forecasterarena-test-'));
  const dbPath = path.join(tempDir, 'test.db');

  mutableEnv.DATABASE_PATH = dbPath;
  if (options.nodeEnv !== undefined) {
    mutableEnv.NODE_ENV = options.nodeEnv;
  }
  if (options.env) {
    for (const [key, value] of Object.entries(options.env)) {
      if (value === undefined) {
        delete mutableEnv[key];
      } else {
        mutableEnv[key] = value;
      }
    }
  }

  vi.resetModules();

  return {
    tempDir,
    dbPath,
    cleanup: async () => {
      try {
        const dbModule = await import('@/lib/db');
        dbModule.closeDb();
      } catch {
        // No-op: database module may not have been imported in this test.
      }

      fs.rmSync(tempDir, { recursive: true, force: true });

      for (const key of Array.from(managedKeys)) {
        const previous = previousValues.get(key);
        if (previous === undefined) {
          delete mutableEnv[key];
        } else {
          mutableEnv[key] = previous;
        }
      }

      vi.resetModules();
    }
  };
}
