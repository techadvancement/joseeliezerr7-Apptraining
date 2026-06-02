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
import { clearCache } from './cache';

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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        if (__DEV__) console.warn('[auth] loadProfile error', error.message);
        return null;
      }
      return data as Profile | null;
    } catch (e) {
      if (__DEV__) console.warn('[auth] loadProfile threw', e);
      return null;
    }
  }

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    let mounted = true;
    let settled = false;

    // Apply session to state IMMEDIATELY (loading: false). Loading the profile
    // is a separate network call against /rest/v1/profiles and we never want
    // it on the critical render path — if Kong/PostgREST is slow the user
    // would otherwise stare at a blank screen forever. Profile fills in
    // asynchronously once it returns.
    const applySession = (session: Session | null) => {
      if (!mounted) return;
      setState((s) => ({
        session,
        user: session?.user ?? null,
        profile: session?.user?.id === s.user?.id ? s.profile : null,
        loading: false,
      }));
      if (session?.user) {
        loadProfile(session.user.id).then((profile) => {
          if (!mounted) return;
          setState((s) =>
            s.user?.id === session.user.id ? { ...s, profile } : s
          );
        });
      }
    };

    // Subscribe FIRST. supabase-js v2 always emits `INITIAL_SESSION` exactly
    // once per subscription after its internal `_recoverAndRefresh()` runs,
    // even if the result is null. That event is the authoritative signal that
    // auth has finished initializing — far more reliable than racing
    // getSession() against a timeout (which is what bounced authenticated
    // users back to /login after reload when refresh was even slightly slow).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        clearCache();
      }
      settled = true;
      applySession(session ?? null);
    });

    // Belt-and-suspenders backup: also call getSession() directly. If for any
    // reason INITIAL_SESSION never fires (storage lock contention, broken SW,
    // etc.) this gets us out of `loading` with the real session from storage.
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted || settled) return;
        settled = true;
        applySession(data.session ?? null);
      } catch (e) {
        if (__DEV__) console.warn('[auth] getSession backup error', e);
      }
    })();

    // Final safety net: if neither path produced a result within 8s, unblock
    // the UI. Leave session as whatever it currently is (likely null) so the
    // user can attempt to sign in instead of staring at a black screen.
    const bootTimeout = setTimeout(() => {
      if (!mounted || settled) return;
      setState((s) => (s.loading ? { ...s, loading: false } : s));
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(bootTimeout);
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Update state synchronously so AuthGate sees the new session by the
        // time login.tsx calls router.replace. Without this, the redirect
        // raced ahead of onAuthStateChange and bounced the user back to /login.
        // Profile loads in the background — never on the critical path,
        // otherwise a slow /rest/v1/profiles call freezes the login button.
        if (data.session) {
          const newUser = data.session.user;
          setState({
            session: data.session,
            user: newUser,
            profile: null,
            loading: false,
          });
          loadProfile(newUser.id).then((profile) => {
            setState((s) => (s.user?.id === newUser.id ? { ...s, profile } : s));
          });
        }
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
