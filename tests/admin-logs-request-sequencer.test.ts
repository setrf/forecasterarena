import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAdminLogsData } from '@/features/admin/logs/api';
import {
  createAdminLogsRequestSequencer
} from '@/features/admin/logs/useAdminLogsController';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('admin logs request sequencing', () => {
  it('aborts the previous request when a newer one starts', () => {
    const sequencer = createAdminLogsRequestSequencer();

    const first = sequencer.beginRequest();
    expect(first.requestId).toBe(1);
    expect(first.signal.aborted).toBe(false);

    const second = sequencer.beginRequest();
    expect(first.signal.aborted).toBe(true);
    expect(second.requestId).toBe(2);
    expect(sequencer.isCurrentRequest(first.requestId)).toBe(false);
    expect(sequencer.isCurrentRequest(second.requestId)).toBe(true);

    sequencer.abortCurrentRequest();
    expect(second.signal.aborted).toBe(true);
    expect(sequencer.isCurrentRequest(second.requestId)).toBe(false);
  });

  it('passes abort signals through to the admin logs fetch helper', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValueOnce(mockResponse(true, {
      logs: [
        {
          id: 'log-1',
          event_type: 'sync',
          event_data: null,
          severity: 'warning',
          created_at: '2026-03-07T12:00:00.000Z'
        }
      ]
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAdminLogsData('warning', { signal: controller.signal })).resolves.toEqual([
      expect.objectContaining({
        id: 'log-1',
        severity: 'warning'
      })
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/logs?severity=warning&limit=100',
      expect.objectContaining({
        cache: 'no-store',
        signal: controller.signal
      })
    );
  });
});

function mockResponse(ok: boolean, json: unknown, status: number = 200) {
  return {
    ok,
    status,
    json: async () => json
  };
}
