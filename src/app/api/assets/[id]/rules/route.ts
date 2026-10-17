import Decimal from 'decimal.js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { materializeAll } from '@/jobs/recurring';
import { getRepositories } from '@/db/repositories';
import { handleRoute, parseJsonBody } from '@/app/api/_lib/api';
import { requireAsset, type IdRouteContext } from '@/app/api/_lib/apiAssets';
import { firstOccurrenceOnOrAfter, todayIso } from '@/domain/dates';
import { serializeRule } from '@/app/api/_lib/serializers';
import { ruleCreateSchema } from '@/app/api/_lib/validation';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: IdRouteContext,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    await requireAsset(id);
    const rules = await getRepositories().rules.listByAsset(id);
    return NextResponse.json(rules.map(serializeRule));
  });
}

export async function POST(
  request: NextRequest,
  context: IdRouteContext,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    await requireAsset(id);
    const body = await parseJsonBody(request, ruleCreateSchema);
    const created = await getRepositories().rules.add({
      assetId: id,
      type: body.type,
      dayOfMonth: body.dayOfMonth,
      qtyDelta: new Decimal(body.qtyDelta),
      valueNative: body.valueNative === undefined ? null : new Decimal(body.valueNative),
      note: body.note ?? null,
      isActive: true,
      nextRunOn: firstOccurrenceOnOrAfter(body.startDate ?? todayIso(), body.dayOfMonth),
    });
    await materializeAll();
    const rules = await getRepositories().rules.listByAsset(id);
    const fresh = rules.find((rule) => rule.id === created.id) ?? created;
    return NextResponse.json(serializeRule(fresh), { status: 201 });
  });
}
