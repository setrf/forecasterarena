export type CronAppResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export function ok<T>(data: T): CronAppResult<T> {
  return { ok: true, data };
}

export function failure(status: number, error: string): CronAppResult<never> {
  return { ok: false, status, error };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
