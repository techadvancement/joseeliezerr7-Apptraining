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
import {
  RailSkeleton,
  SectionHeaderSkeleton,
  VideoCardSkeleton,
} from '@/components/Skeleton';
import { useAuth } from '@/lib/auth';
import { useDownloads } from '@/lib/downloads';
import { listBookmarks } from '@/lib/bookmarks';
import { listContinueWatching } from '@/lib/progress';
import { listAllNotes } from '@/lib/notes';
import { fetchManual, fetchVideo } from '@/lib/api';
import type { Manual, Video } from '@/lib/supabase';
import { Image } from 'expo-image';
import { thumb } from '@/lib/image';
import { colors, radius, spacing, typography } from '@/constants/theme';

type SavedItem =
  | { kind: 'video'; data: Video }
  | { kind: 'manual'; data: Manual };

type RecentNote = {
  video: Video;
  count: number;
  preview: string;
};

function parseNoteEntries(raw: string): { text: string }[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.entries)) {
      return parsed.entries.filter((e: any) => e && typeof e.text === 'string');
    }
  } catch {
    // legacy format
  }
  return [{ text: raw }];
}

export default function LibraryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const downloads = useDownloads();

  const [continueVideos, setContinueVideos] = useState<Video[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [progress, bookmarks, notes] = await Promise.all([
        listContinueWatching(user.id, 6).catch(() => []),
        listBookmarks(user.id).catch(() => []),
        listAllNotes(user.id).catch(() => []),
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
      const noteCards: RecentNote[] = [];
      for (const row of notes.slice(0, 4)) {
        const entries = parseNoteEntries(row.content);
        if (entries.length === 0) continue;
        const v = await fetchVideo(row.video_id).catch(() => null);
        if (!v) continue;
        noteCards.push({
          video: v,
          count: entries.length,
          preview: entries[0]?.text ?? '',
        });
      }
      setRecentNotes(noteCards);
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
    recentNotes.length === 0 &&
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

      {loading ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.section}>
            <SectionHeaderSkeleton />
            <RailSkeleton cardWidth={240} count={3} />
          </View>
          <View style={styles.section}>
            <SectionHeaderSkeleton />
            <View style={{ gap: spacing.md }}>
              <VideoCardSkeleton width={320} />
              <VideoCardSkeleton width={320} />
            </View>
          </View>
        </ScrollView>
      ) : hasNothing ? (
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

          {recentNotes.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader
                title={t('profile.notes')}
                action={t('common.seeAll')}
                onActionPress={() => router.push('/profile/notes')}
              />
              <View style={{ gap: spacing.sm }}>
                {recentNotes.map((n) => {
                  const title = i18n.language === 'es' ? n.video.title_es : n.video.title_en;
                  return (
                    <Pressable
                      key={n.video.id}
                      onPress={() => router.push('/profile/notes')}
                      style={({ pressed }) => [styles.noteRow, pressed && { opacity: 0.85 }]}
                    >
                      <Image
                        source={thumb(n.video.thumbnail_url, 192)}
                        style={styles.noteThumb}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.noteTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.notePreview} numberOfLines={2}>{n.preview}</Text>
                        <Text style={styles.noteCount}>
                          {t('profile.notesCount', { count: n.count })}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Pressable>
                  );
                })}
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
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  scroll: { paddingBottom: spacing.xxxl, gap: spacing.xl },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteThumb: {
    width: 72,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
  },
  noteTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  notePreview: { color: colors.text, fontSize: 13, lineHeight: 17 },
  noteCount: { color: colors.textMuted, fontSize: 11 },
});
