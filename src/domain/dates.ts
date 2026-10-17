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

function dayInMonth(year: number, month: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

export function nextOccurrenceAfter(onDate: string, dayOfMonth: number): string {
  const year = Number(onDate.slice(0, 4));
  const month = Number(onDate.slice(5, 7));
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${pad(nextMonth)}-${pad(dayInMonth(nextYear, nextMonth, dayOfMonth))}`;
}

export function firstOccurrenceOnOrAfter(startDate: string, dayOfMonth: number): string {
  const year = Number(startDate.slice(0, 4));
  const month = Number(startDate.slice(5, 7));
  if (dayOfMonth >= Number(startDate.slice(8, 10))) {
    return `${startDate.slice(0, 7)}-${pad(dayInMonth(year, month, dayOfMonth))}`;
  }
  return nextOccurrenceAfter(`${startDate.slice(0, 7)}-01`, dayOfMonth);
}
