import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRepositories } from '@/db/repositories';
import { handleRoute, noContent, parseJsonBody, requireSession } from '@/app/api/_lib/api';
import { NotFoundError } from '@/domain/errors';
import { serializeRule } from '@/app/api/_lib/serializers';
import { rulePatchSchema, uuidString } from '@/app/api/_lib/validation';

export const runtime = 'nodejs';

interface IdRouteContext {
  params: Promise<{ id: string }>;
}

function requireId(id: string): string {
  if (!uuidString.safeParse(id).success) {
    throw new NotFoundError('Правило не найдено');
  }
  return id;
}

export async function PATCH(
  request: NextRequest,
  context: IdRouteContext,
): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const { id } = await context.params;
    const body = await parseJsonBody(request, rulePatchSchema);
    const updated = await getRepositories().rules.setActive(requireId(id), body.isActive);
    return NextResponse.json(serializeRule(updated));
  });
}

export async function DELETE(
  request: NextRequest,
  context: IdRouteContext,
): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const { id } = await context.params;
    await getRepositories().rules.delete(requireId(id));
    return noContent();
  });
}
