import { getModelDetail } from '@/lib/application/models';
import { jsonError, lookupResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familySlugOrLegacyId } = await params;
    return lookupResultJson(getModelDetail(familySlugOrLegacyId));
  } catch (error) {
    return jsonError(error);
  }
}
