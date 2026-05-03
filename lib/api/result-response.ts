import { NextResponse } from 'next/server';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';
import { safeErrorMessage } from '@/lib/utils/security';

type MaybePromise<T> = T | Promise<T>;

export type ApplicationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: unknown; status: number };

export type LookupResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'not_found'; error: string };

export function jsonError(error: unknown, status = 500): NextResponse {
  return NextResponse.json({ error: safeErrorMessage(error) }, { status });
}

export function jsonMessageError(error: string, status = 500): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function applicationResultJson<T>(result: ApplicationResult<T>): NextResponse {
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return NextResponse.json(result.data);
}

export function jsonWithCache<T>(
  body: T,
  cacheControl: string,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', cacheControl);
  return response;
}

export function noStoreJson<T>(body: T, init?: ResponseInit): NextResponse {
  return jsonWithCache(body, 'no-store', init);
}

export async function cronResultJson<T>(
  request: Request,
  loadResult: () => MaybePromise<ApplicationResult<T>>
): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  return applicationResultJson(await loadResult());
}

export function lookupResultJson<T>(result: LookupResult<T>): NextResponse {
  if (result.status === 'not_found') {
    return jsonMessageError(result.error, 404);
  }

  return NextResponse.json(result.data);
}
