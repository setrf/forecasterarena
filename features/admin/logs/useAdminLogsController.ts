'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAdminLogsData } from '@/features/admin/logs/api';
import type { LogEntry, SeverityFilter } from '@/features/admin/logs/types';

export function useAdminLogsController() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLogs(await fetchAdminLogsData(severity));
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
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
