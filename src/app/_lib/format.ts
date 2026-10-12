const DECIMAL_RE = /^\d+(\.\d+)?$/;
const SIGNED_DECIMAL_RE = /^-?\d+(\.\d+)?$/;

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 });
const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDecimal(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return numberFormat.format(n);
}

export function formatSigned(value: string): string {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return `+${formatDecimal(value)}`;
  return formatDecimal(value);
}

export function signOf(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 0;
  return n > 0 ? 1 : -1;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTimeFormat.format(d);
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowToLocalInput(): string {
  const d = new Date();
  return `${todayIso()}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function normalizeDecimalInput(raw: string, allowNegative = false): string | null {
  const s = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!s) return null;
  const re = allowNegative ? SIGNED_DECIMAL_RE : DECIMAL_RE;
  return re.test(s) ? s : null;
}
