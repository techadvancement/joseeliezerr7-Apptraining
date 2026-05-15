import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { VideoCard } from '@/components/VideoCard';
import { ManualCard } from '@/components/ManualCard';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import { useDownloads } from '@/lib/downloads';
import { listBookmarks } from '@/lib/bookmarks';
import { listContinueWatching } from '@/lib/progress';
import { fetchManual, fetchVideo } from '@/lib/api';
import type { Manual, Video } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

type SavedItem =
  | { kind: 'video'; data: Video }
  | { kind: 'manual'; data: Manual };

export default function LibraryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const downloads = useDownloads();

  const [continueVideos, setContinueVideos] = useState<Video[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [progress, bookmarks] = await Promise.all([
        listContinueWatching(user.id, 6).catch(() => []),
        listBookmarks(user.id).catch(() => []),
      ]);
      const progressVideos: Video[] = [];
      for (const p of progress) {
        const v = await fetchVideo(p.video_id).catch(() => null);
        if (v) progressVideos.push(v);
      }
      setContinueVideos(progressVideos);
      const loaded: SavedItem[] = [];
      for (const b of bookmarks.slice(0, 6)) {
        if (b.type === 'video') {
          const v = await fetchVideo(b.id).catch(() => null);
          if (v) loaded.push({ kind: 'video', data: v });
        } else {
          const m = await fetchManual(b.id).catch(() => null);
          if (m) loaded.push({ kind: 'manual', data: m });
        }
      }
      setSaved(loaded);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadedList = downloads.list().slice(0, 6);
  const hasNothing =
    !loading &&
    continueVideos.length === 0 &&
    saved.length === 0 &&
    downloadedList.length === 0;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('profile.library')}</Text>
          <Text style={styles.subtitle}>{t('profile.librarySub')}</Text>
        </View>
      </View>

      {hasNothing ? (
        <EmptyState
          icon="library-outline"
          title={t('profile.library')}
          description={t('profile.librarySub')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {continueVideos.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title={t('home.continueWatching')} />
              <FlatList
                data={continueVideos}
                horizontal
                keyExtractor={(v) => v.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.lg, paddingRight: spacing.lg, alignItems: 'flex-start' }}
                style={{ flexGrow: 0 }}
                renderItem={({ item }) => <VideoCard video={item} size="md" />}
              />
            </View>
          ) : null}

          {saved.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader
                title={t('profile.bookmarks')}
                action={t('common.seeAll')}
                onActionPress={() => router.push('/profile/bookmarks')}
              />
              <View style={{ gap: spacing.md }}>
                {saved.map((item) =>
                  item.kind === 'video' ? (
                    <VideoCard key={item.data.id} video={item.data} size="lg" />
                  ) : (
                    <ManualCard key={item.data.id} manual={item.data} />
                  )
                )}
              </View>
            </View>
          ) : null}

          {downloadedList.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader
                title={t('profile.downloads')}
                action={t('common.seeAll')}
                onActionPress={() => router.push('/profile/downloads')}
              />
              <FlatList
                data={downloadedList}
                horizontal
                keyExtractor={(it) => it.video.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.lg, paddingRight: spacing.lg, alignItems: 'flex-start' }}
                style={{ flexGrow: 0 }}
                renderItem={({ item }) => <VideoCard video={item.video} size="md" />}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  scroll: { paddingBottom: spacing.xxxl, gap: spacing.xl },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm },
});
