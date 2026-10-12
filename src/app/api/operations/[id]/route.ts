import type { NextRequest } from 'next/server';
import { getRepositories } from '@/db/repositories';
import { handleRoute, noContent, requireSession } from '@/lib/api';
import { NotFoundError } from '@/lib/errors';
import { uuidString } from '@/lib/validation';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleRoute(async () => {
    await requireSession(request);
    const { id } = await context.params;
    if (!uuidString.safeParse(id).success) {
      throw new NotFoundError('Операция не найдена');
    }
    await getRepositories().operations.delete(id);
    return noContent();
  });
}
