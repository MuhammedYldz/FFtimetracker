import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useSyncStatus } from '@/store/useSyncStatus';
import { mergeTable, type Node } from './merge';
import type { Category, Source, Task, TimeEntry, Tombstone } from '@/db/types';

/**
 * Per-row, last-write-wins sync between local storage and Supabase.
 *
 * - Every row carries updatedAt; the side with the greater value wins.
 * - Deletes are tombstones (id + updatedAt) so they propagate across devices
 *   instead of resurrecting on the next pull.
 * - Local always remains the source of truth offline; this only runs when
 *   signed in and online, and never blocks logging time.
 */

type RemoteCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  archived: boolean;
  source: string;
  external_id: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
  deleted: boolean;
};

type RemoteEntry = {
  id: string;
  user_id: string;
  category_id: string | null;
  task_id: string | null;
  task_title: string;
  note: string | null;
  started_at: number;
  ended_at: number;
  duration_ms: number;
  source: string;
  color: string;
  created_at: number;
  updated_at: number;
  deleted: boolean;
};

type RemoteTask = {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  category_id: string | null;
  color: string;
  archived: boolean;
  created_at: number;
  updated_at: number;
  deleted: boolean;
};

function toRemoteTask(t: Task, userId: string): RemoteTask {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    note: t.note,
    category_id: t.categoryId,
    color: t.color,
    archived: t.archived,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    deleted: false,
  };
}

function fromRemoteTask(r: RemoteTask): Task {
  return {
    id: r.id,
    title: r.title,
    note: r.note,
    categoryId: r.category_id,
    color: r.color,
    archived: r.archived,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toRemoteCategory(c: Category, userId: string): RemoteCategory {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    color: c.color,
    icon: c.icon,
    is_default: c.isDefault,
    archived: c.archived,
    source: c.source,
    external_id: c.externalId,
    sort_order: c.sortOrder,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted: false,
  };
}

function fromRemoteCategory(r: RemoteCategory): Category {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    isDefault: r.is_default,
    archived: r.archived,
    source: r.source as Source,
    externalId: r.external_id,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toRemoteEntry(e: TimeEntry, userId: string): RemoteEntry {
  return {
    id: e.id,
    user_id: userId,
    category_id: e.categoryId,
    task_id: e.taskId,
    task_title: e.taskTitle,
    note: e.note,
    started_at: e.startedAt,
    ended_at: e.endedAt,
    duration_ms: e.durationMs,
    source: e.source,
    color: e.color,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    deleted: false,
  };
}

function fromRemoteEntry(r: RemoteEntry): TimeEntry {
  return {
    id: r.id,
    categoryId: r.category_id,
    taskId: r.task_id,
    taskTitle: r.task_title,
    note: r.note,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    durationMs: r.duration_ms,
    source: r.source as Source,
    color: r.color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

let syncing = false;

export interface SyncOutcome {
  ok: boolean;
  error?: string;
}

export async function syncNow(): Promise<SyncOutcome> {
  if (!supabase) return { ok: false, error: 'Sync not configured' };
  if (syncing) return { ok: true };
  syncing = true;
  const status = useSyncStatus.getState();
  status.set({ phase: 'syncing', error: null });
  const fail = (msg: string): SyncOutcome => {
    status.set({ phase: 'error', error: msg });
    return { ok: false, error: msg };
  };
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return fail('Not signed in');

    const store = useStore.getState();
    const tombstoneById = new Map(store.tombstones.map((t) => [t.id, t]));

    // --- Pull remote ---
    const [catRes, taskRes, entryRes] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('time_entries').select('*'),
    ]);
    if (catRes.error) return fail(catRes.error.message);
    if (taskRes.error) return fail(taskRes.error.message);
    if (entryRes.error) return fail(entryRes.error.message);

    const remoteCats = (catRes.data as RemoteCategory[]) ?? [];
    const remoteTasks = (taskRes.data as RemoteTask[]) ?? [];
    const remoteEntries = (entryRes.data as RemoteEntry[]) ?? [];

    // --- Build local nodes (live rows + tombstones) ---
    const localCatNodes: Node<Category>[] = [
      ...store.categories.map((c) => ({ id: c.id, updatedAt: c.updatedAt, deleted: false, row: c })),
      ...store.tombstones
        .filter((t) => t.type === 'category')
        .map((t) => ({ id: t.id, updatedAt: t.updatedAt, deleted: true })),
    ];
    const localTaskNodes: Node<Task>[] = [
      ...store.tasks.map((t) => ({ id: t.id, updatedAt: t.updatedAt, deleted: false, row: t })),
      ...store.tombstones
        .filter((t) => t.type === 'task')
        .map((t) => ({ id: t.id, updatedAt: t.updatedAt, deleted: true })),
    ];
    const localEntryNodes: Node<TimeEntry>[] = [
      ...store.entries.map((e) => ({ id: e.id, updatedAt: e.updatedAt, deleted: false, row: e })),
      ...store.tombstones
        .filter((t) => t.type === 'entry')
        .map((t) => ({ id: t.id, updatedAt: t.updatedAt, deleted: true })),
    ];

    const remoteCatNodes: Node<Category>[] = remoteCats.map((r) => ({
      id: r.id,
      updatedAt: r.updated_at,
      deleted: r.deleted,
      row: fromRemoteCategory(r),
    }));
    const remoteTaskNodes: Node<Task>[] = remoteTasks.map((r) => ({
      id: r.id,
      updatedAt: r.updated_at,
      deleted: r.deleted,
      row: fromRemoteTask(r),
    }));
    const remoteEntryNodes: Node<TimeEntry>[] = remoteEntries.map((r) => ({
      id: r.id,
      updatedAt: r.updated_at,
      deleted: r.deleted,
      row: fromRemoteEntry(r),
    }));

    const catMerge = mergeTable(localCatNodes, remoteCatNodes);
    const taskMerge = mergeTable(localTaskNodes, remoteTaskNodes);
    const entryMerge = mergeTable(localEntryNodes, remoteEntryNodes);

    // --- Push local-newer rows ---
    if (catMerge.toUpsert.length) {
      const rows = catMerge.toUpsert.map((c) => toRemoteCategory(c, userId));
      const { error } = await supabase.from('categories').upsert(rows);
      if (error) return fail(error.message);
    }
    if (taskMerge.toUpsert.length) {
      const rows = taskMerge.toUpsert.map((t) => toRemoteTask(t, userId));
      const { error } = await supabase.from('tasks').upsert(rows);
      if (error) return fail(error.message);
    }
    if (entryMerge.toUpsert.length) {
      const rows = entryMerge.toUpsert.map((e) => toRemoteEntry(e, userId));
      const { error } = await supabase.from('time_entries').upsert(rows);
      if (error) return fail(error.message);
    }
    for (const d of catMerge.toMarkDeleted) {
      await supabase.from('categories').update({ deleted: true, updated_at: d.updatedAt }).eq('id', d.id);
    }
    for (const d of taskMerge.toMarkDeleted) {
      await supabase.from('tasks').update({ deleted: true, updated_at: d.updatedAt }).eq('id', d.id);
    }
    for (const d of entryMerge.toMarkDeleted) {
      await supabase.from('time_entries').update({ deleted: true, updated_at: d.updatedAt }).eq('id', d.id);
    }

    // --- Apply merged result locally ---
    const mergedTombstones: Tombstone[] = [
      ...catMerge.tombstoneIds.map((t) => ({ id: t.id, type: 'category' as const, updatedAt: t.updatedAt })),
      ...taskMerge.tombstoneIds.map((t) => ({ id: t.id, type: 'task' as const, updatedAt: t.updatedAt })),
      ...entryMerge.tombstoneIds.map((t) => ({ id: t.id, type: 'entry' as const, updatedAt: t.updatedAt })),
    ];
    // Preserve original tombstone metadata where it still applies.
    const finalTombstones = mergedTombstones.map((t) => tombstoneById.get(t.id) ?? t);

    await useStore.getState().replaceData({
      categories: catMerge.liveRows,
      tasks: taskMerge.liveRows,
      entries: entryMerge.liveRows,
      tombstones: finalTombstones,
    });

    status.set({ phase: 'ok', lastSyncedAt: Date.now(), error: null });
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Sync failed');
  } finally {
    syncing = false;
  }
}
