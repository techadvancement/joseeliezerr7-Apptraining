import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

WebBrowser.maybeCompleteAuthSession();

// Apple button is shown on iOS (native flow) and on web (Supabase OAuth flow).
// On Android there is no good Apple sign-in path, so we hide it there.
export const isAppleAvailable = Platform.OS === 'ios' || Platform.OS === 'web';

export async function signInWithApple(): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');

  // Web: piggyback on the Supabase-hosted OAuth flow, same as Google.
  if (Platform.OS === 'web') {
    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin + '/' : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo, skipBrowserRedirect: false },
    });
    if (error) throw error;
    return;
  }

  if (Platform.OS !== 'ios') throw new Error('Sign in with Apple is not available on this platform');

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token');
  }
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');

  const redirectTo =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin + '/'
      : AuthSession.makeRedirectUri({
          scheme: 'techadvancement',
          path: 'auth-callback',
        });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw error;

  if (Platform.OS === 'web') {
    // Supabase handles redirect on web — nothing else to do
    return;
  }

  if (!data.url) throw new Error('Could not start OAuth flow');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Sign-in cancelled');
  }
  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.search);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
  }
}
