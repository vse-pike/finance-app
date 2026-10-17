import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { SESSION_COOKIE_NAME, verifySessionToken, type Session } from './auth';
import { HttpError, UnauthorizedError } from '@/domain/errors';

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, 'Ожидается корректный JSON');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      'Некорректный запрос',
      parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}

export async function handleRoute(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.details === undefined
          ? { error: error.message }
          : { error: error.message, details: error.details },
        { status: error.status },
      );
    }
    console.error('[api] непредвиденная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}
