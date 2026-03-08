import { formatDisplayDate } from '@/lib/utils';
import type { AgentCohortData, Decision } from '@/features/cohorts/model-detail/types';

export function createAgentCohortChartData(
  data: AgentCohortData | null,
  seriesKey: string
): Array<{ date: string; [key: string]: string | number }> {
  if (!data?.equity_curve?.length) {
    return [];
  }

  return data.equity_curve.map((point) => ({
    date: point.date,
    [seriesKey]: point.value
  }));
}

export function formatAgentCohortDate(dateStr: string): string {
  return formatDisplayDate(dateStr, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function getDecisionBadgeClass(action: string): string {
  if (action === 'BET') {
    return 'badge-active';
  }

  if (action === 'SELL') {
    return 'badge-pending';
  }

  return '';
}

export function getSideBadgeClass(side: string): string {
  return side === 'YES'
    ? 'bg-green-500/20 text-green-400'
    : 'bg-red-500/20 text-red-400';
}

export function getTradeBadgeClass(tradeType: string): string {
  return tradeType === 'BUY'
    ? 'bg-blue-500/20 text-blue-400'
    : 'bg-orange-500/20 text-orange-400';
}

export function getOutcomeBadgeClass(outcome: string): string {
  const badges: Record<string, string> = {
    WON: 'bg-green-500/20 text-green-400',
    LOST: 'bg-red-500/20 text-red-400',
    EXITED: 'bg-blue-500/20 text-blue-400',
    CANCELLED: 'bg-gray-500/20 text-gray-400',
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    UNKNOWN: 'bg-gray-500/20 text-gray-400'
  };

  return badges[outcome] || badges.UNKNOWN;
}

export function getLinkedRowProps(href?: string) {
  return {
    className: href ? 'cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors' : '',
    role: href ? 'link' : undefined,
    tabIndex: href ? 0 : undefined,
    title: href ? 'Click to view decision rationale' : undefined
  };
}

export function shouldShowDecisionReasoning(decision: Decision): boolean {
  return Boolean(decision.reasoning && decision.reasoning.length > 150);
}
