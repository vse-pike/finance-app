import Decimal from 'decimal.js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRepositories } from '@/db/repositories';
import { handleRoute, parseJsonBody, requireSession } from '@/app/api/_lib/api';
import { requireAsset, type IdRouteContext } from '@/app/api/_lib/apiAssets';
import { serializeOperation } from '@/app/api/_lib/serializers';
import { operationCreateSchema } from '@/app/api/_lib/validation';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: IdRouteContext,
): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const { id } = await context.params;
    await requireAsset(id);
    const body = await parseJsonBody(request, operationCreateSchema);
    const created = await getRepositories().operations.add({
      assetId: id,
      ts: new Date(body.ts),
      type: body.type,
      qtyDelta: new Decimal(body.qtyDelta),
      valueNative: body.valueNative === undefined ? null : new Decimal(body.valueNative),
      note: body.note ?? null,
    });
    return NextResponse.json(serializeOperation(created), { status: 201 });
  });
}
