import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAdminExport,
  fetchAdminStats,
  loginAdmin,
  logoutAdmin,
  runAdminAction
} from '@/features/admin/dashboard/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('admin dashboard api helpers', () => {
  it('fetches stats and falls back to null on non-ok responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(true, { active_cohorts: 1, total_agents: 7, markets_tracked: 12, total_api_cost: 3.14 }))
      .mockResolvedValueOnce(mockResponse(false, { error: 'nope' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAdminStats()).resolves.toEqual({
      active_cohorts: 1,
      total_agents: 7,
      markets_tracked: 12,
      total_api_cost: 3.14
    });
    await expect(fetchAdminStats()).resolves.toBeNull();
  });

  it('normalizes login success and error responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {}))
      .mockResolvedValueOnce(mockResponse(false, { error: 'Wrong password' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(loginAdmin('secret')).resolves.toEqual({ success: true, error: '' });
    await expect(loginAdmin('bad')).resolves.toEqual({ success: false, error: 'Wrong password' });
  });

  it('sends logout requests and normalizes action/export results', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {}))
      .mockResolvedValueOnce(mockResponse(true, { success: true, cohort_number: 9 }))
      .mockResolvedValueOnce(mockResponse(false, { error: 'Cannot run action' }))
      .mockResolvedValueOnce(mockResponse(true, { success: true, download_url: '/download.zip' }))
      .mockResolvedValueOnce(mockResponse(false, { message: 'Export unavailable' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(logoutAdmin()).resolves.toBeUndefined();
    await expect(runAdminAction('start-cohort')).resolves.toEqual({
      type: 'success',
      message: 'Cohort #9 started successfully'
    });
    await expect(runAdminAction('sync-markets')).resolves.toEqual({
      type: 'error',
      message: 'Cannot run action'
    });
    await expect(createAdminExport({
      cohortId: 'c1',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
      includePrompts: true
    })).resolves.toEqual({
      type: 'success',
      message: 'Export ready. Click to download.',
      link: '/download.zip'
    });
    await expect(createAdminExport({
      cohortId: 'c1',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
      includePrompts: false
    })).resolves.toEqual({
      type: 'error',
      message: 'Export unavailable'
    });
  });
});

function mockResponse(ok: boolean, json: unknown) {
  return {
    ok,
    json: async () => json
  };
}
