import { create } from 'zustand';
import type { ActiveTimer, Category, Source, TimeEntry } from '@/db/types';
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

  hydrate: () => Promise<void>;
  startTimer: (input: StartTimerInput) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: () => Promise<TimeEntry | null>;
  discardTimer: () => Promise<void>;
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

  hydrate: async () => {
    const [categories, entries, activeTimer] = await Promise.all([
      repo.loadCategories(),
      repo.loadEntries(),
      repo.loadActiveTimer(),
    ]);
    set({ categories, entries, activeTimer, hydrated: true });
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
}));
