import { create } from 'zustand';

export type SyncPhase = 'idle' | 'syncing' | 'ok' | 'error';

interface SyncStatusState {
  phase: SyncPhase;
  lastSyncedAt: number | null;
  error: string | null;
  set: (patch: Partial<Omit<SyncStatusState, 'set'>>) => void;
}

export const useSyncStatus = create<SyncStatusState>((set) => ({
  phase: 'idle',
  lastSyncedAt: null,
  error: null,
  set: (patch) => set(patch),
}));
