import { create } from 'zustand';
import type {
  ActiveTimer,
  Category,
  Connection,
  Source,
  SyncedTask,
  TimeEntry,
  Tombstone,
} from '@/db/types';
import * as repo from '@/db/repository';
import { newId } from '@/lib/id';
import { computeElapsed } from '@/lib/time';

/** Minimum worked time before a stopped timer is saved as an entry. */
const MIN_ENTRY_MS = 1000;

export interface StartTimerInput {
  categoryId: string | null;
  taskTitle: string;
  color: string;
  source?: Source;
  note?: string | null;
}

interface StoreState {
  hydrated: boolean;
  categories: Category[];
  entries: TimeEntry[];
  activeTimer: ActiveTimer | null;
  tombstones: Tombstone[];
  connections: Connection[];
  syncedTasks: SyncedTask[];

  hydrate: () => Promise<void>;
  replaceData: (data: {
    categories: Category[];
    entries: TimeEntry[];
    tombstones: Tombstone[];
  }) => Promise<void>;
  startTimer: (input: StartTimerInput) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: () => Promise<TimeEntry | null>;
  discardTimer: () => Promise<void>;

  addEntry: (input: AddEntryInput) => Promise<TimeEntry>;
  updateEntry: (id: string, patch: UpdateEntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  addCategory: (input: { name: string; color: string; icon: string }) => Promise<Category>;
  updateCategory: (
    id: string,
    patch: Partial<Pick<Category, 'name' | 'color' | 'icon'>>,
  ) => Promise<void>;
  setCategoryArchived: (id: string, archived: boolean) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addConnection: (conn: Connection) => Promise<void>;
  updateConnection: (id: string, patch: Partial<Connection>) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  setSyncedTasksForConnection: (connectionId: string, tasks: SyncedTask[]) => Promise<void>;
}

export interface AddEntryInput {
  categoryId: string | null;
  taskTitle: string;
  color: string;
  source?: Source;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  note?: string | null;
}

export type UpdateEntryInput = Partial<
  Pick<TimeEntry, 'categoryId' | 'taskTitle' | 'color' | 'startedAt' | 'endedAt' | 'durationMs' | 'note'>
>;

/** Keep entries newest-first by start time. */
function sortEntries(entries: TimeEntry[]): TimeEntry[] {
  return [...entries].sort((a, b) => b.startedAt - a.startedAt);
}

/** Add or update a tombstone for a deleted row. */
function upsertTombstone(tombstones: Tombstone[], t: Tombstone): Tombstone[] {
  return [...tombstones.filter((x) => x.id !== t.id), t];
}

/** Convert the current active timer into a saved entry (or null if too short). */
function timerToEntry(t: ActiveTimer, now: number): TimeEntry | null {
  const durationMs = computeElapsed(t.accumulatedMs, t.segmentStartedAt, t.isRunning, now);
  if (durationMs < MIN_ENTRY_MS) return null;
  return {
    id: t.id,
    categoryId: t.categoryId,
    taskTitle: t.taskTitle,
    note: t.note,
    startedAt: t.entryStartedAt,
    endedAt: now,
    durationMs,
    source: t.source,
    color: t.color,
    createdAt: now,
    updatedAt: now,
  };
}

export const useStore = create<StoreState>((set, get) => ({
  hydrated: false,
  categories: [],
  entries: [],
  activeTimer: null,
  tombstones: [],
  connections: [],
  syncedTasks: [],

  hydrate: async () => {
    const [categories, entries, activeTimer, tombstones, connections, syncedTasks] =
      await Promise.all([
        repo.loadCategories(),
        repo.loadEntries(),
        repo.loadActiveTimer(),
        repo.loadTombstones(),
        repo.loadConnections(),
        repo.loadSyncedTasks(),
      ]);
    set({ categories, entries, activeTimer, tombstones, connections, syncedTasks, hydrated: true });
  },

  replaceData: async ({ categories, entries, tombstones }) => {
    const sorted = sortEntries(entries);
    set({ categories, entries: sorted, tombstones });
    await Promise.all([
      repo.saveCategories(categories),
      repo.saveEntries(sorted),
      repo.saveTombstones(tombstones),
    ]);
  },

  startTimer: async (input) => {
    const now = Date.now();
    const current = get().activeTimer;

    // Switching tasks: save the running one first so no time is lost.
    let entries = get().entries;
    if (current) {
      const entry = timerToEntry(current, now);
      if (entry) {
        entries = [entry, ...entries];
      }
    }

    const timer: ActiveTimer = {
      id: newId(),
      categoryId: input.categoryId,
      taskTitle: input.taskTitle,
      color: input.color,
      source: input.source ?? 'local',
      entryStartedAt: now,
      segmentStartedAt: now,
      accumulatedMs: 0,
      isRunning: true,
      note: input.note ?? null,
    };

    set({ entries, activeTimer: timer });
    await Promise.all([repo.saveEntries(entries), repo.saveActiveTimer(timer)]);
  },

  pauseTimer: async () => {
    const t = get().activeTimer;
    if (!t || !t.isRunning) return;
    const now = Date.now();
    const updated: ActiveTimer = {
      ...t,
      accumulatedMs: t.accumulatedMs + Math.max(0, now - t.segmentStartedAt),
      isRunning: false,
    };
    set({ activeTimer: updated });
    await repo.saveActiveTimer(updated);
  },

  resumeTimer: async () => {
    const t = get().activeTimer;
    if (!t || t.isRunning) return;
    const updated: ActiveTimer = { ...t, segmentStartedAt: Date.now(), isRunning: true };
    set({ activeTimer: updated });
    await repo.saveActiveTimer(updated);
  },

  stopTimer: async () => {
    const t = get().activeTimer;
    if (!t) return null;
    const now = Date.now();
    const entry = timerToEntry(t, now);
    const entries = entry ? [entry, ...get().entries] : get().entries;
    set({ activeTimer: null, entries });
    await Promise.all([repo.saveActiveTimer(null), repo.saveEntries(entries)]);
    return entry;
  },

  discardTimer: async () => {
    set({ activeTimer: null });
    await repo.saveActiveTimer(null);
  },

  addEntry: async (input) => {
    const now = Date.now();
    const entry: TimeEntry = {
      id: newId(),
      categoryId: input.categoryId,
      taskTitle: input.taskTitle,
      note: input.note ?? null,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMs: input.durationMs,
      source: input.source ?? 'local',
      color: input.color,
      createdAt: now,
      updatedAt: now,
    };
    const entries = sortEntries([entry, ...get().entries]);
    set({ entries });
    await repo.saveEntries(entries);
    return entry;
  },

  updateEntry: async (id, patch) => {
    const now = Date.now();
    const entries = sortEntries(
      get().entries.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now } : e)),
    );
    set({ entries });
    await repo.saveEntries(entries);
  },

  deleteEntry: async (id) => {
    const now = Date.now();
    const entries = get().entries.filter((e) => e.id !== id);
    const tombstones = upsertTombstone(get().tombstones, { id, type: 'entry', updatedAt: now });
    set({ entries, tombstones });
    await Promise.all([repo.saveEntries(entries), repo.saveTombstones(tombstones)]);
  },

  addCategory: async (input) => {
    const now = Date.now();
    const maxSort = get().categories.reduce((m, c) => Math.max(m, c.sortOrder), -1);
    const category: Category = {
      id: newId(),
      name: input.name,
      color: input.color,
      icon: input.icon,
      isDefault: false,
      archived: false,
      source: 'local',
      externalId: null,
      sortOrder: maxSort + 1,
      createdAt: now,
      updatedAt: now,
    };
    const categories = [...get().categories, category];
    set({ categories });
    await repo.saveCategories(categories);
    return category;
  },

  updateCategory: async (id, patch) => {
    const now = Date.now();
    const categories = get().categories.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: now } : c,
    );
    set({ categories });
    await repo.saveCategories(categories);
  },

  setCategoryArchived: async (id, archived) => {
    const now = Date.now();
    const categories = get().categories.map((c) =>
      c.id === id ? { ...c, archived, updatedAt: now } : c,
    );
    set({ categories });
    await repo.saveCategories(categories);
  },

  deleteCategory: async (id) => {
    const now = Date.now();
    const categories = get().categories.filter((c) => c.id !== id);
    const tombstones = upsertTombstone(get().tombstones, { id, type: 'category', updatedAt: now });
    set({ categories, tombstones });
    await Promise.all([repo.saveCategories(categories), repo.saveTombstones(tombstones)]);
  },

  addConnection: async (conn) => {
    const connections = [...get().connections, conn];
    set({ connections });
    await repo.saveConnections(connections);
  },

  updateConnection: async (id, patch) => {
    const connections = get().connections.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
    );
    set({ connections });
    await repo.saveConnections(connections);
  },

  deleteConnection: async (id) => {
    const connections = get().connections.filter((c) => c.id !== id);
    const syncedTasks = get().syncedTasks.filter((t) => t.connectionId !== id);
    set({ connections, syncedTasks });
    await Promise.all([repo.saveConnections(connections), repo.saveSyncedTasks(syncedTasks)]);
  },

  setSyncedTasksForConnection: async (connectionId, tasks) => {
    const others = get().syncedTasks.filter((t) => t.connectionId !== connectionId);
    const syncedTasks = [...others, ...tasks];
    set({ syncedTasks });
    await repo.saveSyncedTasks(syncedTasks);
  },
}));
