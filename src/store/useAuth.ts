import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getRedirectUrl } from '@/lib/appUrl';
import { useStore } from '@/store/useStore';
import * as repo from '@/db/repository';

const scopeFor = (user: User | null | undefined) => (user ? `u:${user.id}` : 'anon');

interface AuthState {
  ready: boolean; // initial session check done
  session: Session | null;
  user: User | null;
  recovery: boolean; // a password-recovery link was opened
  init: () => void;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  clearRecovery: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  session: null,
  user: null,
  recovery: false,

  init: () => {
    // Apply a session: switch the local data scope only when the identity
    // actually changes, so token refreshes don't reload the store.
    const apply = (session: Session | null, event?: string) => {
      const user = session?.user ?? null;
      const nextScope = scopeFor(user);
      const store = useStore.getState();
      // Hydrate on first load, or whenever the identity scope changes.
      if (!store.hydrated || store.scope !== nextScope) {
        void store.switchScope(nextScope);
      }
      set({ session, user, ready: true });
      if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
    };

    if (!supabase) {
      void useStore.getState().switchScope('anon');
      set({ ready: true });
      return;
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    supabase.auth.onAuthStateChange((event, session) => apply(session, event));
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: 'Sync is not configured.', needsConfirmation: false };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getRedirectUrl() },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    // Supabase returns a user with no identities when the email already exists.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return {
        error: 'This email is already registered. Try signing in or resetting your password.',
        needsConfirmation: false,
      };
    }
    return { error: null, needsConfirmation: !data.session };
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Sync is not configured.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    const uid = get().user?.id;
    if (supabase) await supabase.auth.signOut();
    // Wipe the signed-in account's local cache so it isn't visible after
    // sign-out (e.g. on a shared device). Cloud data is untouched.
    if (uid) await repo.clearScope(`u:${uid}`);
    set({ session: null, user: null, recovery: false });
    await useStore.getState().switchScope('anon');
  },

  sendPasswordReset: async (email) => {
    if (!supabase) return { error: 'Sync is not configured.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl(),
    });
    return { error: error?.message ?? null };
  },

  updatePassword: async (password) => {
    if (!supabase) return { error: 'Sync is not configured.' };
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) set({ recovery: false });
    return { error: error?.message ?? null };
  },

  clearRecovery: () => set({ recovery: false }),
}));

export { isSupabaseConfigured };
