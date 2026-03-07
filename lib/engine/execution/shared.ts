import type { ExecResult } from '@/lib/engine/execution/types';

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function fail<T>(error: string): ExecResult<T> {
  return { ok: false, error };
}
