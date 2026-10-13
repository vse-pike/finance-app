import Decimal from 'decimal.js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRepositories } from '@/db/repositories';
import { handleRoute, parseJsonBody, requireSession } from '@/app/api/_lib/api';
import { requireAsset, type IdRouteContext } from '@/app/api/_lib/apiAssets';
import { serializeRevaluation } from '@/app/api/_lib/serializers';
import { revaluationCreateSchema } from '@/app/api/_lib/validation';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: IdRouteContext,
): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const { id } = await context.params;
    await requireAsset(id);
    const body = await parseJsonBody(request, revaluationCreateSchema);
    const created = await getRepositories().revaluations.add({
      assetId: id,
      onDate: body.onDate,
      priceNative: new Decimal(body.priceNative),
      kind: body.kind,
      source: body.source ?? null,
      note: body.note ?? null,
    });
    return NextResponse.json(serializeRevaluation(created), { status: 201 });
  });
}
