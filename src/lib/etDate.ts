// ET-safe date helpers using string-based YYYY-MM-DD operations
// Always construct Date objects at 12:00 UTC to avoid timezone rollbacks when formatting in ET

export const ET_TZ = 'America/New_York';

export const todayETStr = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

export const toUTCDateNoon = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0)); // noon UTC
};

export const fromUTCDate = (date: Date): string => date.toISOString().slice(0, 10);

export const addDaysStr = (dateStr: string, days: number): string => {
  const d = toUTCDateNoon(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTCDate(d);
};

export const startOfWeekStr = (dateStr: string): string => {
  const d = toUTCDateNoon(dateStr);
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = (day + 1) % 7; // days since Saturday (week starts Saturday)
  d.setUTCDate(d.getUTCDate() - diff);
  return fromUTCDate(d);
};

export const endOfWeekStr = (startStr: string): string => addDaysStr(startStr, 6);

export const formatET = (dateStr: string, options: Intl.DateTimeFormatOptions): string => {
  const d = toUTCDateNoon(dateStr);
  return new Intl.DateTimeFormat('en-US', { timeZone: ET_TZ, ...options }).format(d);
};
