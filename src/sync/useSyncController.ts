import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { useStore } from '@/store/useStore';
import { syncNow } from './sync';

/**
 * Drives background sync while signed in:
 * - once when a session appears,
 * - whenever the app returns to the foreground,
 * - debounced after local data changes.
 * Mounted once at the app root. Never blocks the UI.
 */
export function useSyncController() {
  const userId = useAuth((s) => s.user?.id ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync on sign-in.
  useEffect(() => {
    if (userId) syncNow();
  }, [userId]);

  // Sync when app returns to foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useAuth.getState().user) syncNow();
    });
    return () => sub.remove();
  }, []);

  // Debounced sync after local data mutations.
  useEffect(() => {
    const unsub = useStore.subscribe((state, prev) => {
      if (!useAuth.getState().user) return;
      if (
        state.entries === prev.entries &&
        state.categories === prev.categories &&
        state.tasks === prev.tasks &&
        state.connections === prev.connections &&
        state.tombstones === prev.tombstones
      ) {
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => syncNow(), 2500);
    });
    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
}
