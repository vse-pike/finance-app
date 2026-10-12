import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRepositories } from '@/db/repositories';
import { handleRoute, noContent, parseJsonBody, requireSession } from '@/lib/api';
import { requireAsset, type IdRouteContext } from '@/lib/apiAssets';
import { ConflictError } from '@/lib/errors';
import {
  serializeAsset,
  serializeOperation,
  serializeRevaluation,
  serializeRule,
} from '@/lib/serializers';
import { assetPatchSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: IdRouteContext,
): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const { id } = await context.params;
    const asset = await requireAsset(id);
    const { operations, revaluations, rules } = getRepositories();
    const [assetOperations, assetRevaluations, assetRules] = await Promise.all([
      operations.listByAsset(asset.id),
      revaluations.listByAsset(asset.id),
      rules.listByAsset(asset.id),
    ]);
    return NextResponse.json({
      asset: serializeAsset(asset),
      operations: assetOperations.map(serializeOperation),
      revaluations: assetRevaluations.map(serializeRevaluation),
      rules: assetRules.map(serializeRule),
    });
  });
}

export async function PATCH(
  request: NextRequest,
  context: IdRouteContext,
): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const { id } = await context.params;
    await requireAsset(id);
    const body = await parseJsonBody(request, assetPatchSchema);
    const updated = await getRepositories().assets.update(id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.note !== undefined ? { note: body.note ?? null } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.closedOn !== undefined ? { closedOn: body.closedOn ?? null } : {}),
    });
    return NextResponse.json(serializeAsset(updated));
  });
}

export async function DELETE(
  request: NextRequest,
  context: IdRouteContext,
): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const { id } = await context.params;
    await requireAsset(id);
    const { operations, assets } = getRepositories();
    if (await operations.hasOperations(id)) {
      throw new ConflictError('У актива есть операции — сначала удали их');
    }
    await assets.delete(id);
    return noContent();
  });
}
