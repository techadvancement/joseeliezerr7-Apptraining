import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { VideoCard } from '@/components/VideoCard';
import { ManualCard } from '@/components/ManualCard';
import { CategoryChip } from '@/components/CategoryChip';
import { EmptyState } from '@/components/EmptyState';
import { ManualCardSkeleton, VideoCardSkeleton } from '@/components/Skeleton';
import { useResponsive } from '@/lib/responsive';
import { useAuth } from '@/lib/auth';
import { listBookmarks } from '@/lib/bookmarks';
import { fetchManual, fetchVideo } from '@/lib/api';
import type { Manual, Video } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

type Filter = 'all' | 'video' | 'manual';
type Item =
  | { kind: 'video'; data: Video }
  | { kind: 'manual'; data: Manual };

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isPhone } = useResponsive();
  const listCols = isPhone ? 1 : 2;
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const list = await listBookmarks(user.id);
      const loaded: Item[] = [];
      for (const b of list) {
        if (b.type === 'video') {
          const v = await fetchVideo(b.id).catch(() => null);
          if (v) loaded.push({ kind: 'video', data: v });
        } else {
          const m = await fetchManual(b.id).catch(() => null);
          if (m) loaded.push({ kind: 'manual', data: m });
        }
      }
      setItems(loaded);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((i) => (filter === 'all' ? true : i.kind === filter));

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('profile.bookmarks')}</Text>
      </View>

      <View style={styles.chips}>
        <CategoryChip
          label={t('manuals.all')}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <CategoryChip
          label={t('tabs.videos')}
          selected={filter === 'video'}
          onPress={() => setFilter('video')}
        />
        <CategoryChip
          label={t('tabs.manuals')}
          selected={filter === 'manual'}
          onPress={() => setFilter('manual')}
        />
      </View>

      {loading ? (
        <View style={styles.list}>
          <VideoCardSkeleton width={320} />
          <ManualCardSkeleton />
          <VideoCardSkeleton width={320} />
        </View>
      ) : (
        <FlatList
          key={`cols-${listCols}`}
          data={filtered}
          keyExtractor={(it) => `${it.kind}-${it.data.id}`}
          numColumns={listCols}
          columnWrapperStyle={listCols > 1 ? { gap: spacing.md } : undefined}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <View style={listCols > 1 ? { flex: 1 } : undefined}>
              {item.kind === 'video' ? (
                <VideoCard video={item.data} size="lg" fullWidth={listCols > 1} />
              ) : (
                <ManualCard manual={item.data} />
              )}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-outline"
              title={t('profile.bookmarksEmpty')}
              description={t('profile.bookmarksEmptyDesc')}
              tone="accent"
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.text },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
});
