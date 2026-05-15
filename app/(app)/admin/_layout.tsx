import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useIsAdmin } from '@/lib/auth';

export default function AdminLayout() {
  const isAdmin = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) router.replace('/(app)');
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
