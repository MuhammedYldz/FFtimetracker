import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveTimer, Category, Connection, SyncedTask, Task, TimeEntry, Tombstone } from './types';
import { DEFAULT_CATEGORIES } from './defaults';

/**
 * Offline-first local store backed by AsyncStorage (localStorage on web,
 * native key-value on iOS/Android). Everything here works with no network.
 *
 * Storage is SCOPED per identity: `anon` while signed out, `u:<userId>` while
 * signed in. This keeps anonymous data fully separate from any account and
 * stops one account's data showing under another on a shared device.
 */

// The active scope; switched by the store on sign-in/out.
let scope = 'anon';
export function setScope(s: string) {
  scope = s;
}
export function getScope() {
  return scope;
}

const NAMES = [
  'categories',
  'tasks',
  'entries',
  'activeTimer',
  'tombstones',
  'connections',
  'syncedTasks',
  'seeded',
] as const;
const key = (name: (typeof NAMES)[number]) => `ff:${scope}:${name}:v1`;

async function readJSON<T>(k: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(k);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

async function writeJSON<T>(k: string, value: T): Promise<void> {
  await AsyncStorage.setItem(k, JSON.stringify(value));
}

/** Remove every key for a given scope (used to wipe a user's cache on sign-out). */
export async function clearScope(s: string): Promise<void> {
  await AsyncStorage.multiRemove(NAMES.map((n) => `ff:${s}:${n}:v1`));
}

// --- Categories -----------------------------------------------------------

export async function loadCategories(): Promise<Category[]> {
  const seeded = await AsyncStorage.getItem(key('seeded'));
  if (!seeded) {
    const now = Date.now();
    const seededCats: Category[] = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      createdAt: now,
      updatedAt: now,
    }));
    await writeJSON(key('categories'), seededCats);
    await AsyncStorage.setItem(key('seeded'), '1');
    return seededCats;
  }
  return readJSON<Category[]>(key('categories'), []);
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await writeJSON(key('categories'), categories);
}

// --- Tasks ----------------------------------------------------------------

export async function loadTasks(): Promise<Task[]> {
  return readJSON<Task[]>(key('tasks'), []);
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await writeJSON(key('tasks'), tasks);
}

// --- Time entries ---------------------------------------------------------

export async function loadEntries(): Promise<TimeEntry[]> {
  return readJSON<TimeEntry[]>(key('entries'), []);
}

export async function saveEntries(entries: TimeEntry[]): Promise<void> {
  await writeJSON(key('entries'), entries);
}

// --- Active timer ---------------------------------------------------------

export async function loadActiveTimer(): Promise<ActiveTimer | null> {
  return readJSON<ActiveTimer | null>(key('activeTimer'), null);
}

export async function saveActiveTimer(timer: ActiveTimer | null): Promise<void> {
  if (timer == null) {
    await AsyncStorage.removeItem(key('activeTimer'));
  } else {
    await writeJSON(key('activeTimer'), timer);
  }
}

// --- Tombstones (deleted-row markers, for sync) ---------------------------

export async function loadTombstones(): Promise<Tombstone[]> {
  return readJSON<Tombstone[]>(key('tombstones'), []);
}

export async function saveTombstones(tombstones: Tombstone[]): Promise<void> {
  await writeJSON(key('tombstones'), tombstones);
}

// --- Integrations (connections + synced tasks) ----------------------------

export async function loadConnections(): Promise<Connection[]> {
  return readJSON<Connection[]>(key('connections'), []);
}

export async function saveConnections(connections: Connection[]): Promise<void> {
  await writeJSON(key('connections'), connections);
}

export async function loadSyncedTasks(): Promise<SyncedTask[]> {
  return readJSON<SyncedTask[]>(key('syncedTasks'), []);
}

export async function saveSyncedTasks(tasks: SyncedTask[]): Promise<void> {
  await writeJSON(key('syncedTasks'), tasks);
}
