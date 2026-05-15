import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AudioPlayerProvider } from '@/lib/audioPlayer';
import { DownloadsProvider } from '@/lib/downloads';
import { ToastProvider } from '@/components/Toast';
import { initI18n } from '@/lib/i18n';
import { hasSeenOnboarding } from '@/app/(auth)/onboarding';
import { useAuthDeepLink } from '@/lib/useAuthDeepLink';
import { colors } from '@/constants/theme';

const WEB_MAX_WIDTH = 520;

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useAuthDeepLink();

  useEffect(() => {
    hasSeenOnboarding().then(setOnboarded);
  }, [segments]);

  useEffect(() => {
    if (loading || onboarded === null) return;
    const first = segments[0] as string | undefined;
    const last = segments[segments.length - 1] as string | undefined;
    const inAuthGroup = first === '(auth)';
    const inOnboarding = last === 'onboarding';

    if (!onboarded && !inOnboarding) {
      router.replace('/(auth)/onboarding');
      return;
    }
    if (onboarded && inOnboarding) {
      router.replace(session ? '/(app)' : '/(auth)/login');
      return;
    }
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup && !inOnboarding) {
      router.replace('/(app)');
    }
  }, [session, loading, segments, router, onboarded]);

  if (loading || onboarded === null) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.frame}>
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#06090F' : colors.bg,
  },
  frame: Platform.select({
    web: {
      flex: 1,
      width: '100%',
      maxWidth: WEB_MAX_WIDTH,
      alignSelf: 'center',
      backgroundColor: colors.bg,
    },
    default: { flex: 1 },
  })!,
});
