import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useIsAdmin } from '@/lib/auth';

export default function AdminLayout() {
  const isAdmin = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (isAdmin) return;
    // Defer + try/catch: navigationRef may not be ready on the very first
    // render when expo-router first mounts /admin (e.g. user reload on
    // /admin while session/profile are still loading). Calling replace
    // synchronously then throws "Attempted to navigate before mounting".
    const id = setTimeout(() => {
      try { router.replace('/(app)'); } catch {
        setTimeout(() => { try { router.replace('/(app)'); } catch {} }, 300);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    />
  );
}
