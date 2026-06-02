import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AudioPlayerProvider } from '@/lib/audioPlayer';
import { DownloadsProvider } from '@/lib/downloads';
import { ToastProvider } from '@/components/Toast';
import { initI18n } from '@/lib/i18n';
import { useAuthDeepLink } from '@/lib/useAuthDeepLink';
import { colors } from '@/constants/theme';

// Keep the native splash visible until i18n is ready and the first frame
// has been rendered. Without this, Android shows the splash, hides it as
// soon as JS loads, then briefly flashes the colored bg before our React
// tree mounts. preventAutoHideAsync only affects native builds.
SplashScreen.preventAutoHideAsync().catch(() => {});

function webMaxWidth(width: number): number | undefined {
  if (width < 700) return undefined;
  if (width < 1100) return 960;
  if (width < 1500) return 1320;
  if (width < 1900) return 1640;
  return undefined;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  useAuthDeepLink();

  useEffect(() => {
    if (loading) return;
    // expo-router's segments may be undefined or [] on the first render
    // after hydration on web; redirecting from that empty state can land
    // us at /login even though the URL actually corresponds to an (app)
    // route. Wait until segments resolve before making any routing decision.
    if (!Array.isArray(segments) || segments.length === 0) return;
    const first = segments[0] as string | undefined;
    const last = segments[segments.length - 1] as string | undefined;
    const inAuthGroup = first === '(auth)';
    const inOnboarding = last === 'onboarding';

    // Defer router.replace by 100ms so we don't race the navigator's
    // internal "ready" flag. Calling replace before that throws
    // "Attempted to navigate before mounting the Root Layout component".
    let target: string | null = null;
    if (inOnboarding) {
      target = session ? '/(app)' : '/(auth)/login';
    } else if (!session && !inAuthGroup) {
      target = '/(auth)/login';
    } else if (session && inAuthGroup && last !== 'reset-password') {
      // Recovery flow grants a session AND needs the user to stay on
      // reset-password until they submit the new password. Don't evict.
      target = '/(app)';
    }
    if (!target) return;
    const id = setTimeout(() => {
      try {
        router.replace(target as any);
      } catch {
        // navigator wasn't ready yet — try once more
        setTimeout(() => {
          try { router.replace(target as any); } catch {}
        }, 300);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [session, loading, segments, router]);

  // Always render the children (which include the <Stack> navigator) so
  // expo-router has a mounted Root Layout from the very first render. Any
  // pending navigation from useAuthDeepLink would otherwise fire before
  // the Stack mounts and throw "Attempted to navigate before mounting".
  // While auth is still resolving we overlay a blank View on top so the
  // user doesn't see a flash of the underlying screen.
  return (
    <>
      {children}
      {loading ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
        />
      ) : null}
    </>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { width } = useWindowDimensions();
  const maxW = Platform.OS === 'web' ? webMaxWidth(width) : undefined;
  const showFrame = Platform.OS === 'web' && maxW !== undefined && width > maxW + 80;

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    };
    // If AsyncStorage / i18n init stalls for any reason, render anyway after 3s.
    // Strings will fall back to keys until i18n resolves later, which is far
    // better than a blank screen indefinitely.
    const fallback = setTimeout(finish, 3000);
    initI18n().finally(() => {
      clearTimeout(fallback);
      finish();
    });
    return () => clearTimeout(fallback);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      {Platform.OS === 'web' ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.glowOrb, styles.glowOrbTop]} />
          <View style={[styles.glowOrb, styles.glowOrbBottom]} />
        </View>
      ) : null}
      <View
        style={[
          styles.frame,
          Platform.OS === 'web' && maxW !== undefined ? { maxWidth: maxW } : null,
          showFrame && styles.frameWide,
        ]}
      >
        <SafeAreaProvider>
          <ToastProvider>
            <AuthProvider>
              <DownloadsProvider>
                <AudioPlayerProvider>
                  <AuthGate>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.bg },
                        animation: 'fade',
                      }}
                    >
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="(app)" />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                  </AuthGate>
                </AudioPlayerProvider>
              </DownloadsProvider>
            </AuthProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </View>
      {!ready ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
        />
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#06090F' : colors.bg,
    overflow: 'hidden',
  },
  frame: Platform.select({
    web: {
      flex: 1,
      width: '100%',
      alignSelf: 'center',
      backgroundColor: colors.bg,
    },
    default: { flex: 1 },
  })!,
  frameWide: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)',
  } as any,
  glowOrb: {
    position: 'absolute',
    width: 720,
    height: 720,
    borderRadius: 360,
    opacity: 0.32,
    filter: 'blur(140px)',
  } as any,
  glowOrbTop: {
    top: -260,
    left: -220,
    backgroundColor: colors.primary,
  },
  glowOrbBottom: {
    bottom: -280,
    right: -200,
    backgroundColor: colors.accent,
  },
});
