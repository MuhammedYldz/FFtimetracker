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

export type AuthMethod = 'none' | 'api_key' | 'bearer' | 'basic';

/** A configured integration. Secrets are NOT stored here — they live in secure storage keyed by id. */
export interface Connection {
  id: string;
  type: 'custom' | 'jira' | 'azure';
  name: string;
  baseUrl: string;
  authMethod: AuthMethod;
  apiKeyHeader: string | null; // header name when authMethod === 'api_key'
  tasksPath: string; // appended to baseUrl, e.g. /api/tasks
  resultsPath: string | null; // JSON path to the array, e.g. "data" or "items"; null = root array
  map: { id: string; title: string; status: string | null; assignee: string | null };
  assigneeFilter: string | null; // only keep tasks whose mapped assignee equals this
  createdAt: number;
  updatedAt: number;
}

/** A task pulled from an integration, shown in the picker alongside categories. */
export interface SyncedTask {
  id: string; // `${connectionId}:${externalId}`
  connectionId: string;
  source: Source;
  externalId: string;
  title: string;
  status: string | null;
  assignee: string | null;
  color: string;
  fetchedAt: number;
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
