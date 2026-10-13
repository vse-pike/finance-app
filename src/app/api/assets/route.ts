import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRepositories } from '@/db/repositories';
import { computeAssetMetrics } from '@/domain/assetMetrics';
import { handleRoute, parseJsonBody, requireSession } from '@/app/api/_lib/api';
import { groupBy } from '@/app/api/_lib/collections';
import { serializeAsset } from '@/app/api/_lib/serializers';
import { assetCreateSchema } from '@/app/api/_lib/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const { assets, operations, revaluations } = getRepositories();
    const [assetList, allOperations, allRevaluations] = await Promise.all([
      assets.list(),
      operations.listAll(),
      revaluations.listAll(),
    ]);
    const opsByAsset = groupBy(allOperations, (op) => op.assetId);
    const revsByAsset = groupBy(allRevaluations, (rv) => rv.assetId);
    const now = new Date();
    return NextResponse.json(
      assetList.map((asset) => ({
        ...serializeAsset(asset),
        ...computeAssetMetrics(
          asset,
          opsByAsset.get(asset.id) ?? [],
          revsByAsset.get(asset.id) ?? [],
          now,
        ),
      })),
    );
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const body = await parseJsonBody(request, assetCreateSchema);
    const created = await getRepositories().assets.create({
      name: body.name,
      kind: body.kind,
      unit: body.unit,
      quoteCurrency: body.quoteCurrency,
      valuation: body.valuation,
      openedOn: body.openedOn,
      note: body.note ?? null,
    });
    return NextResponse.json(
      { ...serializeAsset(created), ...computeAssetMetrics(created, [], []) },
      { status: 201 },
    );
  });
}
