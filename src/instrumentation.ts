export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const required = ['DATABASE_URL', 'AUTH_USERNAME', 'AUTH_PASSWORD', 'SESSION_SECRET'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Не заданы переменные окружения: ${missing.join(', ')}`);
  }
  const { startRecurringJob } = await import('./jobs/recurring');
  startRecurringJob();
}
