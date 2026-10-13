function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function dateKeyOf(t: Date): string {
  return t.toISOString().slice(0, 10);
}

export function isDayOnOrAfter(t: Date, dateKey: string): boolean {
  return dateKeyOf(t) >= dateKey;
}

export function isDayOnOrBefore(t: Date, dateKey: string): boolean {
  return dateKeyOf(t) <= dateKey;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nextOccurrenceAfter(onDate: string, dayOfMonth: number): string {
  const year = Number(onDate.slice(0, 4));
  const month = Number(onDate.slice(5, 7));
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${pad(nextMonth)}-${pad(dayOfMonth)}`;
}

export function firstOccurrenceOnOrAfter(startDate: string, dayOfMonth: number): string {
  const day = Number(startDate.slice(8, 10));
  if (dayOfMonth >= day) return `${startDate.slice(0, 7)}-${pad(dayOfMonth)}`;
  return nextOccurrenceAfter(`${startDate.slice(0, 7)}-01`, dayOfMonth);
}
