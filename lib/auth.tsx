import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIGURED, type Profile } from './supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    country: string;
    phone?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'full_name' | 'country' | 'phone' | 'avatar_url'>>) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@trainingapp.dev',
  user_metadata: { full_name: 'Demo User' },
} as unknown as User;

const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  full_name: 'Demo User',
  country: 'Costa Rica',
  phone: null,
  avatar_url: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });

  async function loadProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[auth] loadProfile error', error.message);
      return null;
    }
    return data as Profile | null;
  }

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const profile = session?.user ? await loadProfile(session.user.id) : null;
      if (!mounted) return;
      setState({
        session,
        user: session?.user ?? null,
        profile,
        loading: false,
      });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const profile = session?.user
          ? await loadProfile(session.user.id)
          : null;
        setState({
          session,
          user: session?.user ?? null,
          profile,
          loading: false,
        });
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      async signIn(email, password) {
        if (!SUPABASE_CONFIGURED) {
          setState((s) => ({
            ...s,
            user: { ...DEMO_USER, email } as User,
            profile: { ...DEMO_PROFILE },
            session: { user: { ...DEMO_USER, email } } as unknown as Session,
          }));
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      async signUp({ email, password, fullName, country, phone }) {
        if (!SUPABASE_CONFIGURED) {
          setState((s) => ({
            ...s,
            user: { ...DEMO_USER, email } as User,
            profile: { ...DEMO_PROFILE, full_name: fullName, country, phone: phone ?? null },
            session: { user: { ...DEMO_USER, email } } as unknown as Session,
          }));
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, country, phone: phone ?? null },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            country,
            phone: phone ?? null,
          });
        }
      },
      async signOut() {
        if (!SUPABASE_CONFIGURED) {
          setState((s) => ({ ...s, user: null, profile: null, session: null }));
          return;
        }
        await supabase.auth.signOut();
      },
      async refreshProfile() {
        if (!state.user) return;
        const profile = await loadProfile(state.user.id);
        setState((s) => ({ ...s, profile }));
      },
      async deleteAccount() {
        if (!SUPABASE_CONFIGURED) {
          setState({ session: null, user: null, profile: null, loading: false });
          return;
        }
        if (!state.user) return;
        const { error } = await supabase.rpc('delete_account');
        if (error) throw error;
        await supabase.auth.signOut();
      },
      async updateProfile(patch) {
        if (!SUPABASE_CONFIGURED) {
          setState((s) => ({
            ...s,
            profile: s.profile ? { ...s.profile, ...patch } : s.profile,
          }));
          return;
        }
        if (!state.user) return;
        const { error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', state.user.id);
        if (error) throw error;
        const profile = await loadProfile(state.user.id);
        setState((s) => ({ ...s, profile }));
      },
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useIsAdmin(): boolean {
  const { profile } = useAuth();
  return profile?.role === 'admin';
}
