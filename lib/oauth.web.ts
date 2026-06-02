import { supabase, SUPABASE_CONFIGURED } from './supabase';

export const isAppleAvailable = false;

export async function signInWithApple(): Promise<void> {
  throw new Error('Sign in with Apple is iOS-only');
}

export async function signInWithGoogle(): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
  const redirectTo = `${window.location.origin}/auth-callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: false },
  });
  if (error) throw error;
}
