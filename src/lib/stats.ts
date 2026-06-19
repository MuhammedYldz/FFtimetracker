import type { Category, Source, TimeEntry } from '@/db/types';
import { addDays, isSameDay, startOfDay, startOfWeek } from './time';

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
  jira: { label: 'Jira', color: '#142175' },
  azure: { label: 'Azure', color: '#0e009d' },
  custom: { label: 'Custom', color: '#e65100' },
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
