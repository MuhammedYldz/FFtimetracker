import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthState {
  ready: boolean; // initial session check done
  session: Session | null;
  user: User | null;
  init: () => void;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  ready: false,
  session: null,
  user: null,

  init: () => {
    if (!supabase) {
      set({ ready: true });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, ready: true });
    });
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: 'Sync is not configured.', needsConfirmation: false };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };
    // If email confirmation is required, there is no active session yet.
    const needsConfirmation = !data.session;
    return { error: null, needsConfirmation };
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Sync is not configured.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));

export { isSupabaseConfigured };
