import type { Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  session: null,
  ready: !supabase,
  signIn: async (email, password) => {
    if (!supabase) throw new Error('Cloud sync is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  signUp: async (email, password) => {
    if (!supabase) throw new Error('Cloud sync is not configured.');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  },
  signOut: async () => {
    await supabase?.auth.signOut();
    set({ session: null });
  },
}));

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    useAuth.setState({ session: data.session, ready: true });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({ session });
  });
  // Only refresh tokens while the app is in the foreground.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase?.auth.startAutoRefresh();
    else supabase?.auth.stopAutoRefresh();
  });
}
