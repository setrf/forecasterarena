import { NextResponse } from 'next/server';
import { getModelDetail } from '@/lib/application/models';
import { safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familySlugOrLegacyId } = await params;
    const result = getModelDetail(familySlugOrLegacyId);

    if (result.status === 'not_found') {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
