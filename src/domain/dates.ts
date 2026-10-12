

export function dateKeyOf(t: Date): string {
  return t.toISOString().slice(0, 10);
}

export function isDayOnOrAfter(t: Date, dateKey: string): boolean {
  return dateKeyOf(t) >= dateKey;
}

export function isDayOnOrBefore(t: Date, dateKey: string): boolean {
  return dateKeyOf(t) <= dateKey;
}
