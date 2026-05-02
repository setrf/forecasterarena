export interface BetResult {
  success: boolean;
  trade_id?: string;
  position_id?: string;
  shares?: number;
  error?: string;
}

export interface SellResult {
  success: boolean;
  trade_id?: string;
  proceeds?: number;
  shares_sold?: number;
  error?: string;
}

export type ExecResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type ExecutionPriceOverrides = Map<string, number>;

export function getExecutionPriceKey(marketId: string, side: string): string {
  return `${marketId}:${side}`;
}
