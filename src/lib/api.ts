import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { SESSION_COOKIE_NAME, verifySessionToken, type Session } from './auth';
import { HttpError, UnauthorizedError } from './errors';

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

function cookieFromHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    return value.startsWith('"') && value.endsWith('"') && value.length >= 2
      ? value.slice(1, -1)
      : value;
  }
  return null;
}

export async function requireSession(request: Request): Promise<Session> {
  const token = cookieFromHeader(
    request.headers.get('cookie'),
    SESSION_COOKIE_NAME,
  );
  const session = await verifySessionToken(token);
  if (!session) throw new UnauthorizedError();
  return session;
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
