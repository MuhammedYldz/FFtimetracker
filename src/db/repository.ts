import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveTimer, Category, TimeEntry, Tombstone } from './types';
import { DEFAULT_CATEGORIES } from './defaults';

/**
 * Offline-first local store backed by AsyncStorage (localStorage on web,
 * native key-value on iOS/Android). Everything here works with no network.
 * Cloud sync (Phase 5) reads/writes through this same layer.
 */

const KEYS = {
  categories: 'ff:categories:v1',
  entries: 'ff:entries:v1',
  activeTimer: 'ff:activeTimer:v1',
  tombstones: 'ff:tombstones:v1',
  seeded: 'ff:seeded:v1',
} as const;

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

async function writeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// --- Categories -----------------------------------------------------------

export async function loadCategories(): Promise<Category[]> {
  const seeded = await AsyncStorage.getItem(KEYS.seeded);
  if (!seeded) {
    const now = Date.now();
    const seededCats: Category[] = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      createdAt: now,
      updatedAt: now,
    }));
    await writeJSON(KEYS.categories, seededCats);
    await AsyncStorage.setItem(KEYS.seeded, '1');
    return seededCats;
  }
  return readJSON<Category[]>(KEYS.categories, []);
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await writeJSON(KEYS.categories, categories);
}

// --- Time entries ---------------------------------------------------------

export async function loadEntries(): Promise<TimeEntry[]> {
  return readJSON<TimeEntry[]>(KEYS.entries, []);
}

export async function saveEntries(entries: TimeEntry[]): Promise<void> {
  await writeJSON(KEYS.entries, entries);
}

// --- Active timer ---------------------------------------------------------

export async function loadActiveTimer(): Promise<ActiveTimer | null> {
  return readJSON<ActiveTimer | null>(KEYS.activeTimer, null);
}

export async function saveActiveTimer(timer: ActiveTimer | null): Promise<void> {
  if (timer == null) {
    await AsyncStorage.removeItem(KEYS.activeTimer);
  } else {
    await writeJSON(KEYS.activeTimer, timer);
  }
}

// --- Tombstones (deleted-row markers, for sync) ---------------------------

export async function loadTombstones(): Promise<Tombstone[]> {
  return readJSON<Tombstone[]>(KEYS.tombstones, []);
}

export async function saveTombstones(tombstones: Tombstone[]): Promise<void> {
  await writeJSON(KEYS.tombstones, tombstones);
}
