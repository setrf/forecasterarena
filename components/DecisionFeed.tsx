'use client';

import { useEffect, useState } from 'react';

interface Decision {
  id: string;
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
  model_display_name: string;
  model_color: string;
  cohort_number: number;
}

interface DecisionFeedProps {
  limit?: number;
  showCohort?: boolean;
  autoRefresh?: boolean;
  className?: string;
}

export default function DecisionFeed({
  limit = 10,
  showCohort = true,
  autoRefresh = false,
  className = ''
}: DecisionFeedProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDecisions() {
      try {
        const res = await fetch(`/api/decisions/recent?limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          setDecisions(data.decisions || []);
        }
      } catch (error) {
        console.error('Error fetching decisions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDecisions();

    if (autoRefresh) {
      const interval = setInterval(fetchDecisions, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [limit, autoRefresh]);

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getActionStyle(action: string): { bg: string; text: string } {
    switch (action) {
      case 'BET': return { bg: 'bg-[var(--accent-emerald)]/20', text: 'text-[var(--accent-emerald)]' };
      case 'SELL': return { bg: 'bg-[var(--accent-amber)]/20', text: 'text-[var(--accent-amber)]' };
      case 'HOLD': return { bg: 'bg-[var(--text-muted)]/20', text: 'text-[var(--text-muted)]' };
      case 'ERROR': return { bg: 'bg-[var(--accent-rose)]/20', text: 'text-[var(--accent-rose)]' };
      default: return { bg: 'bg-[var(--text-muted)]/20', text: 'text-[var(--text-muted)]' };
    }
  }

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 bg-[var(--bg-tertiary)] rounded-lg animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-[var(--border-medium)]" />
              <div className="h-4 w-24 bg-[var(--border-medium)] rounded" />
            </div>
            <div className="h-3 w-full bg-[var(--border-medium)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className={`text-center py-8 text-[var(--text-muted)] ${className}`}>
        <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm">No decisions yet</p>
        <p className="text-xs mt-1">Decisions are made every Sunday</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {decisions.map((decision) => {
        const actionStyle = getActionStyle(decision.action);
        const isExpanded = expandedId === decision.id;
        
        return (
          <div 
            key={decision.id} 
            className="p-4 bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: decision.model_color }}
                />
                <span className="font-medium text-sm">{decision.model_display_name}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${actionStyle.bg} ${actionStyle.text}`}>
                  {decision.action}
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {formatTime(decision.decision_timestamp)}
              </span>
            </div>
            
            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-2">
              {showCohort && (
                <span>Cohort #{decision.cohort_number}</span>
              )}
              <span>Week {decision.decision_week}</span>
            </div>
            
            {/* Reasoning */}
            {decision.reasoning && (
              <div>
                <p 
                  className={`text-sm text-[var(--text-secondary)] ${isExpanded ? '' : 'line-clamp-2'}`}
                >
                  {decision.reasoning}
                </p>
                {decision.reasoning.length > 150 && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                    className="text-xs text-[var(--accent-blue)] hover:underline mt-1"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}



