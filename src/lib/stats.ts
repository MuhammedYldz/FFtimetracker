import type { Category, Source, TimeEntry } from '@/db/types';
import {
  addDays,
  addMonths,
  formatMonthYear,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './time';

export type PeriodMode = 'week' | 'month';

export interface Period {
  start: number; // inclusive
  end: number; // exclusive
  label: string;
  isCurrent: boolean;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Resolve the date range + label for a period (week or month) around `anchor`. */
export function getPeriod(mode: PeriodMode, anchor: number, now = Date.now()): Period {
  if (mode === 'week') {
    const start = startOfWeek(anchor);
    const end = addDays(start, 7);
    const isCurrent = start === startOfWeek(now);
    const last = new Date(end - 1);
    const s = new Date(start);
    const label = isCurrent
      ? 'This week'
      : s.getMonth() === last.getMonth()
        ? `${s.getDate()}–${last.getDate()} ${SHORT_MONTHS[s.getMonth()]}`
        : `${s.getDate()} ${SHORT_MONTHS[s.getMonth()]} – ${last.getDate()} ${SHORT_MONTHS[last.getMonth()]}`;
    return { start, end, label, isCurrent };
  }
  const start = startOfMonth(anchor);
  const end = addMonths(anchor, 1);
  const isCurrent = start === startOfMonth(now);
  return { start, end, label: formatMonthYear(anchor), isCurrent };
}

/** Shift the anchor one period back (-1) or forward (+1). */
export function shiftPeriod(mode: PeriodMode, anchor: number, dir: -1 | 1): number {
  return mode === 'week' ? addDays(startOfWeek(anchor), dir * 7) : addMonths(anchor, dir);
}

export interface Bucket {
  label: string;
  totalMs: number;
  isCurrent: boolean;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Bars for the chart: 7 daily bars for a week, ~weekly buckets for a month. */
export function periodBuckets(
  entries: TimeEntry[],
  mode: PeriodMode,
  anchor: number,
  now = Date.now(),
): Bucket[] {
  const today = startOfDay(now);
  if (mode === 'week') {
    const weekStart = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(addDays(weekStart, i));
      return {
        label: WEEKDAY_LABELS[i],
        totalMs: sumDuration(entriesOnDay(entries, day)),
        isCurrent: day === today,
      };
    });
  }
  // Month → up to 5 buckets of 7 days from the 1st.
  const monthStart = startOfMonth(anchor);
  const monthEnd = addMonths(anchor, 1);
  const buckets: Bucket[] = [];
  for (let i = 0; i < 6; i++) {
    const bStart = addDays(monthStart, i * 7);
    if (bStart >= monthEnd) break;
    const bEnd = Math.min(addDays(bStart, 7), monthEnd);
    buckets.push({
      label: `W${i + 1}`,
      totalMs: sumDuration(entriesInRange(entries, bStart, bEnd)),
      isCurrent: today >= bStart && today < bEnd,
    });
  }
  return buckets;
}

export function sumDuration(entries: TimeEntry[]): number {
  return entries.reduce((acc, e) => acc + e.durationMs, 0);
}

/** Entries whose start falls within [start, end). */
export function entriesInRange(entries: TimeEntry[], start: number, end: number): TimeEntry[] {
  return entries.filter((e) => e.startedAt >= start && e.startedAt < end);
}

export function entriesOnDay(entries: TimeEntry[], dayEpoch: number): TimeEntry[] {
  return entries.filter((e) => isSameDay(e.startedAt, dayEpoch));
}

export interface CategoryBucket {
  key: string;
  label: string;
  color: string;
  totalMs: number;
}

/** Group entries by category (falling back to the saved label for custom/orphaned). */
export function groupByCategory(entries: TimeEntry[], categories: Category[]): CategoryBucket[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const buckets = new Map<string, CategoryBucket>();
  for (const e of entries) {
    const key = e.categoryId ?? `title:${e.taskTitle}`;
    const cat = e.categoryId ? byId.get(e.categoryId) : undefined;
    const label = cat?.name ?? e.taskTitle;
    const color = cat?.color ?? e.color;
    const existing = buckets.get(key);
    if (existing) existing.totalMs += e.durationMs;
    else buckets.set(key, { key, label, color, totalMs: e.durationMs });
  }
  return [...buckets.values()].sort((a, b) => b.totalMs - a.totalMs);
}

const SOURCE_META: Record<Source, { label: string; color: string }> = {
  local: { label: 'Manual', color: '#006a61' },
  todoist: { label: 'Todoist', color: '#e44332' },
  github: { label: 'GitHub', color: '#24292e' },
  notion: { label: 'Notion', color: '#000000' },
  custom: { label: 'Custom', color: '#e65100' },
  jira: { label: 'Jira', color: '#142175' },
  azure: { label: 'Azure', color: '#0e009d' },
};

export interface SourceBucket {
  source: Source;
  label: string;
  color: string;
  totalMs: number;
}

export function groupBySource(entries: TimeEntry[]): SourceBucket[] {
  const buckets = new Map<Source, number>();
  for (const e of entries) buckets.set(e.source, (buckets.get(e.source) ?? 0) + e.durationMs);
  return [...buckets.entries()]
    .map(([source, totalMs]) => ({ source, ...SOURCE_META[source], totalMs }))
    .sort((a, b) => b.totalMs - a.totalMs);
}

/** Total worked ms per day for the 7 days of the week containing `now` (Mon..Sun). */
export function weeklyDailyTotals(entries: TimeEntry[], now: number): { dayEpoch: number; totalMs: number }[] {
  const weekStart = startOfWeek(now);
  return Array.from({ length: 7 }, (_, i) => {
    const dayEpoch = startOfDay(addDays(weekStart, i));
    const totalMs = sumDuration(entriesOnDay(entries, dayEpoch));
    return { dayEpoch, totalMs };
  });
}
