import { NextResponse } from 'next/server';
import { noContent } from '@/lib/api';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth';
export const runtime = 'nodejs';

export async function POST(): Promise<Response> {
  const response: NextResponse = noContent();
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
