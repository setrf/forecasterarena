'use client';

import { useEffect, useState, useCallback } from 'react';

interface LogEntry {
  id: string;
  event_type: string;
  event_data: string | null;
  severity: string;
  created_at: string;
}

type SeverityFilter = 'all' | 'info' | 'warning' | 'error';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (severity !== 'all') params.set('severity', severity);
      params.set('limit', '100');
      
      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [severity]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  function getSeverityStyle(severity: string): { bg: string; text: string; dot: string } {
    switch (severity) {
      case 'error': return { 
        bg: 'bg-[var(--accent-rose)]/10', 
        text: 'text-[var(--accent-rose)]',
        dot: 'bg-[var(--accent-rose)]'
      };
      case 'warning': return { 
        bg: 'bg-[var(--accent-amber)]/10', 
        text: 'text-[var(--accent-amber)]',
        dot: 'bg-[var(--accent-amber)]'
      };
      default: return { 
        bg: 'bg-[var(--accent-emerald)]/10', 
        text: 'text-[var(--accent-emerald)]',
        dot: 'bg-[var(--accent-emerald)]'
      };
    }
  }

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatEventData(data: string | null): object | null {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return { raw: data };
    }
  }

  const errorCount = logs.filter(l => l.severity === 'error').length;
  const warningCount = logs.filter(l => l.severity === 'warning').length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">System Logs</h1>
          <p className="text-[var(--text-secondary)]">
            Monitor system events and debug issues
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-[var(--border-medium)]"
            />
            Auto-refresh
          </label>
          <button onClick={fetchLogs} className="btn btn-secondary text-sm">
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-value">{logs.length}</div>
          <div className="stat-label">Total Logs</div>
        </div>
        <div className="stat-card border-[var(--accent-amber)]/30">
          <div className="stat-value text-[var(--accent-amber)]">{warningCount}</div>
          <div className="stat-label">Warnings</div>
        </div>
        <div className="stat-card border-[var(--accent-rose)]/30">
          <div className="stat-value text-[var(--accent-rose)]">{errorCount}</div>
          <div className="stat-label">Errors</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'info', 'warning', 'error'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`btn text-sm ${severity === s ? 'btn-primary' : 'btn-secondary'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="glass-card divide-y divide-[var(--border-subtle)]">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            No logs found
          </div>
        ) : (
          logs.map((log) => {
            const style = getSeverityStyle(log.severity);
            const isExpanded = expandedId === log.id;
            const eventData = formatEventData(log.event_data);
            
            return (
              <div key={log.id} className="p-4 hover:bg-[var(--bg-secondary)] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${style.bg} ${style.text}`}>
                      {log.severity.toUpperCase()}
                    </span>
                    <span className="font-medium">{log.event_type}</span>
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">
                    {formatTime(log.created_at)}
                  </span>
                </div>
                
                {eventData && (
                  <div>
                    <pre 
                      className={`text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-3 rounded-lg overflow-x-auto ${
                        isExpanded ? '' : 'max-h-20 overflow-hidden'
                      }`}
                    >
                      {JSON.stringify(eventData, null, 2)}
                    </pre>
                    {JSON.stringify(eventData).length > 200 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="text-xs text-[var(--accent-blue)] hover:underline mt-1"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}



