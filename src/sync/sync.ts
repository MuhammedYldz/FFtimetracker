import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useSyncStatus } from '@/store/useSyncStatus';
import { mergeTable, type Node } from './merge';
import { getSecret, setSecret } from '@/lib/secureStore';
import { fetchTasksForConnection } from '@/integrations/providers';
import type { AuthMethod, Category, Connection, Source, Task, TimeEntry, Tombstone } from '@/db/types';

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

type RemoteConnection = {
  id: string;
  user_id: string;
  type: string;
  name: string;
  base_url: string;
  auth_method: string;
  api_key_header: string | null;
  tasks_path: string;
  results_path: string | null;
  map: Connection['map'];
  assignee_filter: string | null;
  extra: Record<string, string> | null;
  token: string | null;
  created_at: number;
  updated_at: number;
  deleted: boolean;
};

/** Map a connection to its remote row, including its secret token. */
async function toRemoteConnection(c: Connection, userId: string): Promise<RemoteConnection> {
  return {
    id: c.id,
    user_id: userId,
    type: c.type,
    name: c.name,
    base_url: c.baseUrl,
    auth_method: c.authMethod,
    api_key_header: c.apiKeyHeader,
    tasks_path: c.tasksPath,
    results_path: c.resultsPath,
    map: c.map,
    assignee_filter: c.assigneeFilter,
    extra: c.extra,
    token: (await getSecret(c.id)) ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted: false,
  };
}

function fromRemoteConnection(r: RemoteConnection): Connection {
  return {
    id: r.id,
    type: r.type as Connection['type'],
    name: r.name,
    baseUrl: r.base_url,
    authMethod: r.auth_method as AuthMethod,
    apiKeyHeader: r.api_key_header,
    tasksPath: r.tasks_path,
    resultsPath: r.results_path,
    map: r.map,
    assigneeFilter: r.assignee_filter,
    extra: r.extra,
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
    const [catRes, taskRes, entryRes, connRes] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('time_entries').select('*'),
      supabase.from('connections').select('*'),
    ]);
    if (catRes.error) return fail(catRes.error.message);
    if (taskRes.error) return fail(taskRes.error.message);
    if (entryRes.error) return fail(entryRes.error.message);
    if (connRes.error) return fail(connRes.error.message);

    const remoteCats = (catRes.data as RemoteCategory[]) ?? [];
    const remoteTasks = (taskRes.data as RemoteTask[]) ?? [];
    const remoteEntries = (entryRes.data as RemoteEntry[]) ?? [];
    const remoteConns = (connRes.data as RemoteConnection[]) ?? [];
    const remoteTokenById = new Map(remoteConns.map((r) => [r.id, r.token]));

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
    const localConnNodes: Node<Connection>[] = [
      ...store.connections.map((c) => ({ id: c.id, updatedAt: c.updatedAt, deleted: false, row: c })),
      ...store.tombstones
        .filter((t) => t.type === 'connection')
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
    const remoteConnNodes: Node<Connection>[] = remoteConns.map((r) => ({
      id: r.id,
      updatedAt: r.updated_at,
      deleted: r.deleted,
      row: fromRemoteConnection(r),
    }));

    const catMerge = mergeTable(localCatNodes, remoteCatNodes);
    const taskMerge = mergeTable(localTaskNodes, remoteTaskNodes);
    const entryMerge = mergeTable(localEntryNodes, remoteEntryNodes);
    const connMerge = mergeTable(localConnNodes, remoteConnNodes);

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
    if (connMerge.toUpsert.length) {
      const rows = await Promise.all(connMerge.toUpsert.map((c) => toRemoteConnection(c, userId)));
      const { error } = await supabase.from('connections').upsert(rows);
      if (error) return fail(error.message);
    }
    for (const d of connMerge.toMarkDeleted) {
      await supabase.from('connections').update({ deleted: true, updated_at: d.updatedAt }).eq('id', d.id);
    }

    // --- Apply merged result locally ---
    const mergedTombstones: Tombstone[] = [
      ...catMerge.tombstoneIds.map((t) => ({ id: t.id, type: 'category' as const, updatedAt: t.updatedAt })),
      ...taskMerge.tombstoneIds.map((t) => ({ id: t.id, type: 'task' as const, updatedAt: t.updatedAt })),
      ...entryMerge.tombstoneIds.map((t) => ({ id: t.id, type: 'entry' as const, updatedAt: t.updatedAt })),
      ...connMerge.tombstoneIds.map((t) => ({ id: t.id, type: 'connection' as const, updatedAt: t.updatedAt })),
    ];
    // Preserve original tombstone metadata where it still applies.
    const finalTombstones = mergedTombstones.map((t) => tombstoneById.get(t.id) ?? t);

    // Bring tokens for synced connections into this device's secure storage.
    for (const conn of connMerge.liveRows) {
      const localToken = await getSecret(conn.id);
      const remoteToken = remoteTokenById.get(conn.id);
      if (!localToken && remoteToken) await setSecret(conn.id, remoteToken);
    }

    await useStore.getState().replaceData({
      categories: catMerge.liveRows,
      tasks: taskMerge.liveRows,
      entries: entryMerge.liveRows,
      connections: connMerge.liveRows,
      tombstones: finalTombstones,
    });

    status.set({ phase: 'ok', lastSyncedAt: Date.now(), error: null });

    // Best-effort: fetch tasks for connections that arrived without a local
    // cache (e.g. synced from another device). Errors are ignored.
    const syncedNow = useStore.getState().syncedTasks;
    for (const conn of connMerge.liveRows) {
      if (syncedNow.some((t) => t.connectionId === conn.id)) continue;
      const result = await fetchTasksForConnection(conn);
      if (result.ok && result.tasks.length) {
        await useStore.getState().setSyncedTasksForConnection(conn.id, result.tasks);
      }
    }
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Sync failed');
  } finally {
    syncing = false;
  }
}
