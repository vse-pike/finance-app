

export const SESSION_COOKIE_NAME = 'session';

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface SessionPayload {
  u: string;
  exp: number;
}

export interface Session {
  username: string;
}

function secretBytes(): Uint8Array<ArrayBuffer> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET не задан: сгенерируй его (openssl rand -hex 32) и добавь в .env',
    );
  }
  return encoder.encode(secret);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded =
    base64.length % 4 === 0 ? base64 : base64 + '='.repeat(4 - (base64.length % 4));
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signPayload(payloadB64: string): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  return new Uint8Array(signature);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function createSessionToken(username: string): Promise<string> {
  const payload: SessionPayload = {
    u: username,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sigB64 = toBase64Url(await signPayload(payloadB64));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<Session | null> {
  if (!token) return null;
  const separator = token.indexOf('.');
  if (separator <= 0 || separator === token.length - 1) return null;
  const payloadB64 = token.slice(0, separator);
  const sigB64 = token.slice(separator + 1);
  if (sigB64.includes('.')) return null;
  let signature: Uint8Array;
  try {
    signature = fromBase64Url(sigB64);
  } catch {
    return null;
  }
  const expected = await signPayload(payloadB64);
  if (!constantTimeEqual(expected, signature)) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(decoder.decode(fromBase64Url(payloadB64))) as SessionPayload;
  } catch {
    return null;
  }
  if (typeof payload.u !== 'string' || typeof payload.exp !== 'number') return null;
  if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
  return { username: payload.u };
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
