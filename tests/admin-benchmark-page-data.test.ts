import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAdminBenchmarkConfig,
  createAdminBenchmarkRelease,
  fetchAdminBenchmarkOverview,
  promoteAdminBenchmarkConfig
} from '@/features/admin/benchmark/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('admin benchmark page api helpers', () => {
  it('hydrates overview and returns null for unauthorized sessions', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {
        default_config_id: 'config-1',
        families: [],
        configs: [],
        updated_at: '2026-03-07T00:00:00.000Z'
      }))
      .mockResolvedValueOnce(mockResponse(false, { error: 'Unauthorized' }, 401));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAdminBenchmarkOverview()).resolves.toEqual({
      default_config_id: 'config-1',
      families: [],
      configs: [],
      updated_at: '2026-03-07T00:00:00.000Z'
    });
    await expect(fetchAdminBenchmarkOverview()).resolves.toBeNull();
  });

  it('normalizes release, config, and promotion result messages', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(true, { release: { release_name: 'GPT-5.4' } }))
      .mockResolvedValueOnce(mockResponse(false, { error: 'Duplicate release' }))
      .mockResolvedValueOnce(mockResponse(true, { config: { version_name: 'lineup-v2' } }))
      .mockResolvedValueOnce(mockResponse(true, { version_name: 'lineup-v2' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAdminBenchmarkRelease({
      familyId: 'openai-gpt',
      releaseName: 'GPT-5.4',
      openrouterId: 'openai/gpt-5.4',
      inputPricePerMillion: '5',
      outputPricePerMillion: '15',
      notes: ''
    })).resolves.toEqual({
      type: 'success',
      message: 'GPT-5.4 registered successfully'
    });

    await expect(createAdminBenchmarkRelease({
      familyId: 'openai-gpt',
      releaseName: 'GPT-5.4',
      openrouterId: 'openai/gpt-5.4',
      inputPricePerMillion: '5',
      outputPricePerMillion: '15',
      notes: ''
    })).resolves.toEqual({
      type: 'error',
      message: 'Duplicate release'
    });

    await expect(createAdminBenchmarkConfig({
      versionName: 'lineup-v2',
      methodologyVersion: 'v1',
      notes: '',
      assignments: [{
        familyId: 'openai-gpt',
        releaseId: 'openai-gpt--gpt-5.4',
        inputPricePerMillion: '5',
        outputPricePerMillion: '15'
      }]
    })).resolves.toEqual({
      type: 'success',
      message: 'lineup-v2 created successfully'
    });

    await expect(promoteAdminBenchmarkConfig('config-1')).resolves.toEqual({
      type: 'success',
      message: 'lineup-v2 promoted as the default lineup'
    });
  });
});

function mockResponse(ok: boolean, json: unknown, status: number = 200) {
  return {
    ok,
    status,
    json: async () => json
  };
}
