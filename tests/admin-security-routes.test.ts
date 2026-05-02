import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

const EXPORTS_DIR = path.join(process.cwd(), 'backups', 'exports');

afterEach(() => {
  fs.rmSync(EXPORTS_DIR, { recursive: true, force: true });
  vi.doUnmock('child_process');
  vi.doUnmock('@/lib/api/admin-route');
  vi.doUnmock('@/lib/api/admin-session');
  vi.doUnmock('@/lib/application/health');
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

  it('returns validation errors from the export application service unchanged', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      vi.doMock('@/lib/api/admin-route', () => ({
        ensureAdminAuthenticated: () => null
      }));

      const route = await import('@/app/api/admin/export/route');
      const response = await route.POST(new Request('http://localhost/api/admin/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cohort_id: 'cohort-1',
          from: '2026-03-01T00:00:00.000Z',
          to: '2026-03-02T00:00:00.000Z',
          tables: ['invalid-table']
        })
      }) as any);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'No valid tables requested'
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('sanitizes unexpected admin login errors through the shared helper', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'production',
      env: {
        ADMIN_PASSWORD: 'admin',
        ADMIN_SESSION_SECRET: 'session-secret'
      }
    });

    try {
      vi.doMock('@/lib/api/admin-session', () => ({
        createAdminLoginResponse: () => {
          throw new Error('login parser detail');
        },
        createAdminLogoutResponse: () => Response.json({ success: true })
      }));

      const route = await import('@/app/api/admin/login/route');
      const response = await route.POST(new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'admin' })
      }) as any);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'An internal error occurred' });
    } finally {
      await ctx.cleanup();
    }
  });

  it('streams a generated export download with zip headers', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const filename = 'export-cohort-1-2026-03-01T00-00-00-000Z.zip';
    const filePath = path.join(EXPORTS_DIR, filename);

    try {
      vi.doMock('@/lib/api/admin-route', () => ({
        ensureAdminAuthenticated: () => null
      }));

      fs.mkdirSync(EXPORTS_DIR, { recursive: true });
      fs.writeFileSync(filePath, 'zip payload', 'utf8');

      const route = await import('@/app/api/admin/export/route');
      const response = await route.GET(
        new Request(`http://localhost/api/admin/export?file=${encodeURIComponent(filename)}`) as any
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/zip');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Content-Disposition')).toBe(
        `attachment; filename="${filename}"`
      );
      expect(await response.text()).toBe('zip payload');
    } finally {
      await ctx.cleanup();
    }
  });

  it('stores export artifacts under BACKUP_PATH and neutralizes CSV formula cells', async () => {
    const backupPath = path.join(process.cwd(), 'tmp-test-backups');
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'test',
      env: { BACKUP_PATH: backupPath }
    });

    try {
      const constants = await import('@/lib/application/admin-export/constants');
      const helpers = await import('@/lib/application/admin-export/helpers');

      expect(constants.EXPORTS_DIR).toBe(path.join(backupPath, 'exports'));
      expect(helpers.csvEscape('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
      expect(helpers.csvEscape('+cmd')).toBe("'+cmd");
      expect(helpers.csvEscape('-cmd')).toBe("'-cmd");
      expect(helpers.csvEscape('@cmd')).toBe("'@cmd");
      expect(helpers.csvEscape('\tcmd')).toBe("'\tcmd");
      expect(helpers.csvEscape('\rcmd')).toBe("'\rcmd");
    } finally {
      fs.rmSync(backupPath, { recursive: true, force: true });
      await ctx.cleanup();
    }
  });
});

describe('health route', () => {
  it('adapts application health reports into public status codes', async () => {
    const getHealthHttpStatus = vi.fn((status: 'ok' | 'error') => (
      status === 'ok' ? 200 : 503
    ));
    const payload = {
      status: 'error' as const,
      timestamp: '2026-03-06T00:00:00.000Z',
      checks: {
        database: { status: 'error' as const, message: 'Database unavailable' },
        environment: { status: 'ok' as const, message: undefined },
        data_integrity: { status: 'ok' as const, message: undefined }
      }
    };

    vi.doMock('@/lib/application/health', () => ({
      getHealthReport: () => payload,
      getHealthHttpStatus
    }));

    const route = await import('@/app/api/health/route');
    const response = await route.GET();

    expect(getHealthHttpStatus).toHaveBeenCalledOnce();
    expect(getHealthHttpStatus).toHaveBeenCalledWith('error');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(payload);
  });

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
