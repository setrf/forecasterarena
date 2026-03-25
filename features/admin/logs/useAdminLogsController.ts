'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAdminLogsData } from '@/features/admin/logs/api';
import type { LogEntry, SeverityFilter } from '@/features/admin/logs/types';

export interface AdminLogsRequestSequencer {
  beginRequest: () => {
    requestId: number;
    signal: AbortSignal;
  };
  isCurrentRequest: (requestId: number) => boolean;
  abortCurrentRequest: () => void;
}

export function createAdminLogsRequestSequencer(): AdminLogsRequestSequencer {
  let currentRequestId = 0;
  let currentController: AbortController | null = null;

  return {
    beginRequest() {
      currentController?.abort();
      currentController = new AbortController();
      currentRequestId += 1;

      return {
        requestId: currentRequestId,
        signal: currentController.signal
      };
    },
    isCurrentRequest(requestId: number) {
      return requestId === currentRequestId && !(currentController?.signal.aborted ?? false);
    },
    abortCurrentRequest() {
      currentController?.abort();
    }
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function useAdminLogsController() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const requestSequencerRef = useRef<AdminLogsRequestSequencer | null>(null);

  if (!requestSequencerRef.current) {
    requestSequencerRef.current = createAdminLogsRequestSequencer();
  }

  const fetchLogs = useCallback(async () => {
    const requestSequencer = requestSequencerRef.current;
    if (!requestSequencer) {
      return;
    }

    const { requestId, signal } = requestSequencer.beginRequest();
    setLoading(true);

    try {
      const nextLogs = await fetchAdminLogsData(severity, { signal });
      if (!requestSequencer.isCurrentRequest(requestId)) {
        return;
      }

      setLogs(nextLogs);
      setError(null);
    } catch (error) {
      if (signal.aborted || !requestSequencer.isCurrentRequest(requestId) || isAbortError(error)) {
        return;
      }

      console.error('Error fetching logs:', error);
      setError(error instanceof Error && error.message === 'unauthorized'
        ? 'Admin authentication required to view logs.'
        : 'Unable to load system logs right now.');
    } finally {
      if (requestSequencer.isCurrentRequest(requestId)) {
        setLoading(false);
      }
    }
  }, [severity]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  useEffect(() => () => {
    requestSequencerRef.current?.abortCurrentRequest();
  }, []);

  const errorCount = useMemo(
    () => logs.filter((log) => log.severity === 'error').length,
    [logs]
  );
  const warningCount = useMemo(
    () => logs.filter((log) => log.severity === 'warning').length,
    [logs]
  );

  function toggleExpanded(logId: string) {
    setExpandedId((current) => current === logId ? null : logId);
  }

  return {
    logs,
    loading,
    error,
    severity,
    autoRefresh,
    expandedId,
    errorCount,
    warningCount,
    setSeverity,
    setAutoRefresh,
    fetchLogs,
    toggleExpanded
  };
}
