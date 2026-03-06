import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

const EXPORTS_DIR = path.join(process.cwd(), 'backups', 'exports');

afterEach(() => {
  fs.rmSync(EXPORTS_DIR, { recursive: true, force: true });
  vi.doUnmock('child_process');
  vi.doUnmock('@/lib/api/admin-route');
  vi.doUnmock('@/lib/db');
  vi.resetModules();
});

describe('admin export route', () => {
  it('sanitizes the generated filename and invokes zip without shell interpolation', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const spawnSync = vi.fn((command: string, args: string[]) => {
      expect(command).toBe('zip');
      expect(args[0]).toBe('-j');

      const zipPath = args[1];
      fs.mkdirSync(path.dirname(zipPath), { recursive: true });
      fs.writeFileSync(zipPath, 'fake zip contents', 'utf8');

      return {
        status: 0,
        stdout: '',
        stderr: '',
        error: undefined
      };
    });

    try {
      vi.doMock('@/lib/api/admin-route', () => ({
        ensureAdminAuthenticated: () => null
      }));
      vi.doMock('child_process', () => ({
        spawnSync
      }));

      const route = await import('@/app/api/admin/export/route');
      const maliciousCohortId = '../bad;$(touch hacked)';

      const response = await route.POST(new Request('http://localhost/api/admin/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cohort_id: maliciousCohortId,
          from: '2026-03-01T00:00:00.000Z',
          to: '2026-03-02T00:00:00.000Z'
        })
      }) as any);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(spawnSync).toHaveBeenCalledOnce();

      const [, argv] = spawnSync.mock.calls[0] as [string, string[]];
      const downloadUrl = body.download_url as string;
      const filename = decodeURIComponent(downloadUrl.split('file=')[1]);

      expect(downloadUrl).toMatch(/^\/api\/admin\/export\?file=export-/);
      expect(filename).toMatch(/^export-[a-zA-Z0-9_-]+-\d{4}-\d{2}-\d{2}T.*\.zip$/);
      expect(filename).not.toContain('..');
      expect(filename).not.toContain('/');
      expect(filename).not.toContain(';');
      expect(filename).not.toContain('$');
      expect(path.basename(argv[1])).toBe(filename);
      expect(argv.slice(2).length).toBeGreaterThan(0);
      expect(argv.slice(2).every((file) => path.isAbsolute(file))).toBe(true);
    } finally {
      await ctx.cleanup();
    }
  });
});

describe('health route', () => {
  it('treats development cron/admin fallbacks as configured', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'development',
      env: {
        OPENROUTER_API_KEY: 'test-openrouter-key',
        CRON_SECRET: undefined,
        ADMIN_PASSWORD: undefined
      }
    });

    try {
      const route = await import('@/app/api/health/route');
      const response = await route.GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.checks.environment).toEqual({
        status: 'ok',
        message: undefined
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('redacts exact missing secret names from the public health response', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'production',
      env: {
        OPENROUTER_API_KEY: undefined,
        CRON_SECRET: undefined,
        ADMIN_PASSWORD: undefined
      }
    });

    try {
      const route = await import('@/app/api/health/route');
      const response = await route.GET();
      const body = await response.json();
      const serialized = JSON.stringify(body);

      expect(response.status).toBe(503);
      expect(body.checks.environment).toEqual({
        status: 'error',
        message: 'Required configuration is incomplete'
      });
      expect(serialized).not.toContain('OPENROUTER_API_KEY');
      expect(serialized).not.toContain('CRON_SECRET');
      expect(serialized).not.toContain('ADMIN_PASSWORD');
    } finally {
      await ctx.cleanup();
    }
  });

  it('redacts internal database exception details from the public health response', async () => {
    vi.doMock('@/lib/db', () => ({
      getDb: () => {
        throw new Error('db password leaked');
      }
    }));

    const route = await import('@/app/api/health/route');
    const response = await route.GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body.checks.database).toEqual({
      status: 'error',
      message: 'Database unavailable'
    });
    expect(body.checks.data_integrity).toEqual({
      status: 'error',
      message: 'Integrity check unavailable'
    });
    expect(serialized).not.toContain('db password leaked');
  });
});
