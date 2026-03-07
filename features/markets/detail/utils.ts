export function getMarketStatusBadge(status: string): { className: string; label: string } {
  switch (status) {
    case 'active':
      return { className: 'badge-active', label: 'Active' };
    case 'resolved':
      return { className: 'badge-completed', label: 'Resolved' };
    case 'closed':
      return { className: 'badge-pending', label: 'Closed' };
    default:
      return { className: '', label: status };
  }
}
