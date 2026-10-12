import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRoute, parseJsonBody } from '@/lib/api';
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/auth';
import { HttpError } from '@/lib/errors';
import { timingSafeEqualStrings } from '@/lib/password';
import {
  clientIpOf,
  isLoginBlocked,
  recordLoginFailure,
  resetLoginFailures,
} from '@/lib/rateLimit';
import { loginSchema } from '@/lib/validation';
export const runtime = 'nodejs';

function expectedCredentials(): { username: string; password: string } {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  if (!username || !password) {
    throw new HttpError(
      500,
      'Авторизация не настроена: задай AUTH_USERNAME и AUTH_PASSWORD в .env',
    );
  }
  return { username, password };
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleRoute(async () => {
    const ip = clientIpOf(request);
    if (isLoginBlocked(ip)) {
      throw new HttpError(429, 'Слишком много попыток входа, попробуй через минуту');
    }
    const body = await parseJsonBody(request, loginSchema);
    const expected = expectedCredentials();
    const usernameOk = timingSafeEqualStrings(body.username, expected.username);
    const passwordOk = timingSafeEqualStrings(body.password, expected.password);
    if (!usernameOk || !passwordOk) {
      recordLoginFailure(ip);
      throw new HttpError(401, 'Неверное имя пользователя или пароль');
    }
    resetLoginFailures(ip);
    const response = NextResponse.json({ ok: true, username: body.username });
    response.cookies.set(SESSION_COOKIE_NAME, await createSessionToken(body.username), {
      ...sessionCookieOptions(),
    });
    return response;
  });
}
