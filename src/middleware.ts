import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

const PUBLIC_PATHS = new Set(['/login', '/api/auth/login']);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  for (const path of PUBLIC_PATHS) {
    if (pathname.startsWith(`${path}/`)) return true;
  }
  return false;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
  }
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
