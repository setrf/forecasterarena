import type { AdminModelLineupReviewSummary } from '@/lib/application/admin-benchmark';

interface AdminBenchmarkLineupReviewPanelProps {
  review: AdminModelLineupReviewSummary | null;
  checking: boolean;
  approvingReviewId: string | null;
  dismissingReviewId: string | null;
  onCheck: () => void;
  onApprove: (reviewId: string) => void;
  onDismiss: (reviewId: string) => void;
}

function formatPrice(value: number | null): string {
  return value === null ? 'n/a' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function statusLabel(status: AdminModelLineupReviewSummary['status']): string {
  switch (status) {
    case 'open':
      return 'Review Needed';
    case 'no_changes':
      return 'No Changes';
    case 'approved':
      return 'Approved';
    case 'dismissed':
      return 'Dismissed';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

function decisionClass(decision: string): string {
  if (decision === 'upgrade') {
    return 'text-[var(--accent-emerald)]';
  }
  if (decision === 'needs_review' || decision === 'missing') {
    return 'text-[var(--accent-gold)]';
  }
  return 'text-[var(--text-muted)]';
}

export function AdminBenchmarkLineupReviewPanel({
  review,
  checking,
  approvingReviewId,
  dismissingReviewId,
  onCheck,
  onApprove,
  onDismiss
}: AdminBenchmarkLineupReviewPanelProps) {
  const canApprove = review?.status === 'open' && review.candidates.some((candidate) => candidate.decision === 'upgrade');
  const canDismiss = review && ['open', 'no_changes', 'failed'].includes(review.status);

  return (
    <div className="glass-card p-6 border border-[var(--border-medium)] mb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div>
          <h2 className="heading-block">OpenRouter Lineup Review</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Weekly detection proposes exact future-cohort releases. Approval never rolls active cohorts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCheck}
            disabled={checking || approvingReviewId !== null || dismissingReviewId !== null}
            className="btn btn-secondary text-sm"
          >
            {checking ? 'Checking...' : 'Check OpenRouter'}
          </button>
          {review ? (
            <>
              <button
                onClick={() => onApprove(review.id)}
                disabled={!canApprove || checking || approvingReviewId !== null || dismissingReviewId !== null}
                className="btn btn-primary text-sm"
              >
                {approvingReviewId === review.id ? 'Approving...' : 'Approve Future Lineup'}
              </button>
              {canDismiss ? (
                <button
                  onClick={() => onDismiss(review.id)}
                  disabled={checking || approvingReviewId !== null || dismissingReviewId !== null}
                  className="btn btn-secondary text-sm"
                >
                  {dismissingReviewId === review.id ? 'Dismissing...' : 'Dismiss'}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {!review ? (
        <p className="text-sm text-[var(--text-secondary)]">No OpenRouter lineup review has been recorded yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
            <span className="px-2 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
              {statusLabel(review.status)}
            </span>
            <span className="text-[var(--text-muted)]">
              Checked {new Date(review.checked_at).toLocaleString()}
            </span>
            <span className="text-[var(--text-muted)]">
              {review.candidate_count} item(s) for review
            </span>
            {review.error_message ? (
              <span className="text-[var(--accent-rose)]">{review.error_message}</span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Family</th>
                  <th>Current</th>
                  <th>Candidate</th>
                  <th>Price / 1M</th>
                  <th>Decision</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {review.candidates.map((candidate) => (
                  <tr key={candidate.family_id}>
                    <td>{candidate.family_name}</td>
                    <td>
                      <div>{candidate.current_release_name ?? 'n/a'}</div>
                      <div className="text-xs text-[var(--text-muted)] font-mono">{candidate.current_openrouter_id ?? 'n/a'}</div>
                    </td>
                    <td>
                      <div>{candidate.candidate_name ?? 'No change'}</div>
                      <div className="text-xs text-[var(--text-muted)] font-mono">{candidate.candidate_openrouter_id ?? ''}</div>
                    </td>
                    <td className="font-mono">
                      {formatPrice(candidate.input_price_per_million)} / {formatPrice(candidate.output_price_per_million)}
                    </td>
                    <td className={decisionClass(candidate.decision)}>{candidate.decision.replace('_', ' ')}</td>
                    <td className="text-sm text-[var(--text-muted)]">{candidate.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
