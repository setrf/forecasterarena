/**
 * Weekly OpenRouter model lineup review cron endpoint.
 *
 * @route POST /api/cron/check-model-lineup
 */

import { checkModelLineup } from '@/lib/application/cron';
import { cronResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  return cronResultJson(request, checkModelLineup);
}
