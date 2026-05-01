import { checkModelLineupReview } from '@/lib/application/admin-benchmark';
import { ok, type CronAppResult } from '@/lib/application/cron/types';

export async function checkModelLineup(): Promise<CronAppResult<{
  success: true;
  review_id: string;
  status: string;
  candidate_count: number;
  checked_at: string;
}>> {
  const review = await checkModelLineupReview();

  return ok({
    success: true,
    review_id: review.id,
    status: review.status,
    candidate_count: review.candidate_count,
    checked_at: review.checked_at
  });
}
