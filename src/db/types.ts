export type Source = 'local' | 'jira' | 'azure' | 'custom';

export interface Category {
  id: string;
  name: string;
  color: string; // hex tag color
  icon: string; // MaterialIcons name
  isDefault: boolean;
  archived: boolean;
  source: Source;
  externalId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/** Tombstone for a deleted row, so deletes propagate across devices on sync. */
export interface Tombstone {
  id: string;
  type: 'entry' | 'category';
  updatedAt: number;
}

export interface TimeEntry {
  id: string;
  categoryId: string | null;
  taskTitle: string;
  note: string | null;
  startedAt: number; // epoch ms
  endedAt: number; // epoch ms
  durationMs: number; // worked time, excludes paused gaps
  source: Source;
  color: string;
  createdAt: number;
  updatedAt: number;
}

/** The single in-progress timer, persisted so it survives restarts. */
export interface ActiveTimer {
  id: string;
  categoryId: string | null;
  taskTitle: string;
  color: string;
  source: Source;
  entryStartedAt: number; // first start, used as the entry's startedAt
  segmentStartedAt: number; // start of the current running segment
  accumulatedMs: number; // worked time from completed segments
  isRunning: boolean;
  note: string | null;
}
