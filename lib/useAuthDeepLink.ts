import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from './supabase';

function parseHash(url: string): URLSearchParams {
  const hashIdx = url.indexOf('#');
  if (hashIdx < 0) return new URLSearchParams();
  return new URLSearchParams(url.slice(hashIdx + 1));
}

// Defer router calls past the synchronous boot cycle so they don't race
// expo-router's internal navigator initialization. Without this, calling
// router.replace from a Promise microtask (Linking.getInitialURL's then())
// throws "Attempted to navigate before mounting the Root Layout component".
function deferredReplace(router: ReturnType<typeof useRouter>, target: string) {
  setTimeout(() => {
    try {
      router.replace(target as any);
    } catch {
      setTimeout(() => {
        try { router.replace(target as any); } catch {}
      }, 300);
    }
  }, 100);
}

async function handleUrl(url: string, router: ReturnType<typeof useRouter>) {
  const hashParams = parseHash(url);
  let type = hashParams.get('type');
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (accessToken && refreshToken) {
    // Implicit flow: tokens in URL fragment.
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } else {
    // PKCE flow: ?code=<authCode>&type=<...>. Required on Android where
    // Chrome strips the # fragment when redirecting to a custom scheme.
    try {
      const u = new URL(url);
      const code = u.searchParams.get('code');
      type = type || u.searchParams.get('type');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
    } catch {
      // URL constructor can throw for malformed deep links; ignore.
    }
  }

  if (type === 'recovery') {
    deferredReplace(router, '/(auth)/reset-password');
  } else if (type === 'signup') {
    deferredReplace(router, '/(app)');
  }
}

export function useAuthDeepLink() {
  const router = useRouter();
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url, router);
    });
    const sub = Linking.addEventListener('url', ({ url }) =>
      handleUrl(url, router),
    );
    return () => sub.remove();
  }, [router]);
}
