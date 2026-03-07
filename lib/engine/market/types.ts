export interface SyncMarketsResult {
  success: boolean;
  markets_added: number;
  markets_updated: number;
  errors: string[];
  duration_ms: number;
}
