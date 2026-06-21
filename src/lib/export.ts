import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import type { Category, Task, TimeEntry } from '@/db/types';
import { formatClock } from './time';

function csvCell(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ymd(epoch: number): string {
  const d = new Date(epoch);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Build a CSV of entries suitable for client billing / payroll. */
export function entriesToCsv(entries: TimeEntry[], categories: Category[], tasks: Task[]): string {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const taskName = new Map(tasks.map((t) => [t.id, t.title]));
  const header = ['Date', 'Start', 'End', 'Hours', 'Task', 'Type', 'Source', 'Note'];
  const rows = [...entries]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((e) => [
      ymd(e.startedAt),
      formatClock(e.startedAt),
      formatClock(e.endedAt),
      (e.durationMs / 3_600_000).toFixed(2),
      (e.taskId && taskName.get(e.taskId)) || e.taskTitle,
      (e.categoryId && catName.get(e.categoryId)) || '',
      e.source,
      e.note ?? '',
    ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export interface ExportResult {
  ok: boolean;
  error?: string;
}

/** Export entries to a CSV file — download on web, share sheet on native. */
export async function exportEntriesCsv(
  entries: TimeEntry[],
  categories: Category[],
  tasks: Task[],
): Promise<ExportResult> {
  if (entries.length === 0) return { ok: false, error: 'No entries to export yet.' };
  const csv = entriesToCsv(entries, categories, tasks);
  const filename = `focusflow-${ymd(Date.now())}.csv`;

  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { ok: true };
    }

    const uri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export time entries', UTI: 'public.comma-separated-values-text' });
      return { ok: true };
    }
    return { ok: false, error: 'Sharing is not available on this device.' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Export failed' };
  }
}
