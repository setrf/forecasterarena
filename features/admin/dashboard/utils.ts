export function getAdminActionSuccessMessage(
  action: string,
  data: Record<string, unknown>
): string {
  switch (action) {
    case 'start-cohort':
      return `Cohort #${data.cohort_number || 'new'} started successfully`;
    case 'sync-markets':
      return `Synced ${data.markets_added || 0} new, ${data.markets_updated || 0} updated`;
    case 'backup':
      return 'Backup created successfully';
    default:
      return 'Action completed';
  }
}
