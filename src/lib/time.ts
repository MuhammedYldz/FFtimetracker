/** Elapsed worked ms for a timer given its accumulated time and running state. */
export function computeElapsed(
  accumulatedMs: number,
  segmentStartedAt: number,
  isRunning: boolean,
  now: number,
): number {
  return accumulatedMs + (isRunning ? Math.max(0, now - segmentStartedAt) : 0);
}

/** Format ms as H:MM:SS (e.g. 1:05:09). */
export function formatHMS(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
}

/** Format ms as a compact human duration (e.g. 1h 05m, 12m, 0m). */
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

/** Format an epoch ms as HH:MM (24h). */
export function formatClock(epochMs: number): string {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Local midnight (start of day) for the given epoch ms. */
export function startOfDay(epochMs: number): number {
  const d = new Date(epochMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(epochMs: number, n: number): number {
  const d = new Date(epochMs);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** "Today" / "Yesterday" / "Mon, 19 Jun" relative to now. */
export function formatDateLabel(epochMs: number, now = Date.now()): string {
  const day = startOfDay(epochMs);
  const today = startOfDay(now);
  if (day === today) return 'Today';
  if (day === today - DAY_MS) return 'Yesterday';
  if (day === today + DAY_MS) return 'Tomorrow';
  const d = new Date(epochMs);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Full date e.g. "Friday, 19 June 2026". */
export function formatLongDate(epochMs: number): string {
  const full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const fullMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const d = new Date(epochMs);
  return `${full[d.getDay()]}, ${d.getDate()} ${fullMonths[d.getMonth()]} ${d.getFullYear()}`;
}

/** Combine a day (epoch) with an "HH:MM" clock string into an epoch ms; null if invalid. */
export function clockToEpoch(dayEpoch: number, hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const d = new Date(startOfDay(dayEpoch));
  d.setHours(h, min, 0, 0);
  return d.getTime();
}
