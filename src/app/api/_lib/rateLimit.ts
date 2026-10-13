

const WINDOW_MS = 60_000;
const MAX_FAILURES = 5;

const globalForRateLimit = globalThis as unknown as {
  __financeLoginFailures?: Map<string, number[]>;
};
const failures =
  globalForRateLimit.__financeLoginFailures ?? new Map<string, number[]>();
globalForRateLimit.__financeLoginFailures = failures;

function prune(now: number): void {
  for (const [ip, stamps] of failures) {
    const fresh = stamps.filter((ts) => now - ts < WINDOW_MS);
    if (fresh.length === 0) {
      failures.delete(ip);
    } else {
      failures.set(ip, fresh);
    }
  }
}

export function isLoginBlocked(ip: string): boolean {
  prune(Date.now());
  return (failures.get(ip)?.length ?? 0) >= MAX_FAILURES;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  prune(now);
  const stamps = failures.get(ip) ?? [];
  stamps.push(now);
  failures.set(ip, stamps);
}

export function resetLoginFailures(ip: string): void {
  failures.delete(ip);
}

export function clientIpOf(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
