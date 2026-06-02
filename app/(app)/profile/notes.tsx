import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import { listAllNotes } from '@/lib/notes';
import { fetchVideo } from '@/lib/api';
import { thumb } from '@/lib/image';
import { formatDuration } from '@/lib/format';
import type { Video } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Entry = {
  id: string;
  position: number | null;
  text: string;
  created_at: string;
};

type VideoNotes = {
  video: Video;
  entries: Entry[];
  updated_at: string;
};

function parseEntries(raw: string): Entry[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.entries)) {
      return parsed.entries.filter(
        (e: any) =>
          e &&
          typeof e.text === 'string' &&
          typeof e.id === 'string' &&
          (e.position === null || typeof e.position === 'number'),
      ) as Entry[];
    }
  } catch {
    // Legacy single-string note — show as one untimed entry.
  }
  return [
    {
      id: 'legacy',
      position: null,
      text: raw,
      created_at: new Date().toISOString(),
    },
  ];
}

export default function NotesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<VideoNotes[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const rows = await listAllNotes(user.id);
      const results: VideoNotes[] = [];
      for (const row of rows) {
        const entries = parseEntries(row.content);
        if (entries.length === 0) continue;
        const v = await fetchVideo(row.video_id).catch(() => null);
        if (!v) continue;
        results.push({ video: v, entries: sortEntries(entries), updated_at: row.updated_at });
      }
      setGroups(results);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  function openNote(videoId: string, position: number | null) {
    if (position != null && position > 0) {
      router.push({ pathname: '/videos/play/[id]', params: { id: videoId, t: String(position) } });
    } else {
      router.push({ pathname: '/videos/play/[id]', params: { id: videoId } });
    }
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('profile.notes')}</Text>
          <Text style={styles.subtitle}>{t('profile.notesSub')}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : groups.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={t('profile.notesEmptyTitle')}
          description={t('profile.notesEmptyDesc')}
          tone="accent"
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.video.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const title = i18n.language === 'es' ? item.video.title_es : item.video.title_en;
            return (
              <View style={styles.card}>
                <Pressable
                  onPress={() => openNote(item.video.id, null)}
                  style={({ pressed }) => [styles.videoHead, pressed && { opacity: 0.85 }]}
                >
                  <Image
                    source={thumb(item.video.thumbnail_url, 240)}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {title}
                    </Text>
                    <Text style={styles.meta}>
                      {t('profile.notesCount', { count: item.entries.length })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
                <View style={styles.entries}>
                  {item.entries.map((e) => (
                    <Pressable
                      key={e.id}
                      onPress={() => openNote(item.video.id, e.position)}
                      style={({ pressed }) => [styles.entryRow, pressed && { opacity: 0.85 }]}
                    >
                      <View
                        style={[
                          styles.stamp,
                          e.position == null && styles.stampDisabled,
                        ]}
                      >
                        <Ionicons
                          name={e.position != null ? 'play' : 'pricetag-outline'}
                          size={11}
                          color={e.position != null ? '#fff' : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.stampText,
                            e.position == null && { color: colors.textMuted },
                          ]}
                        >
                          {e.position != null
                            ? formatDuration(e.position)
                            : t('videos.noTimestamp')}
                        </Text>
                      </View>
                      <Text style={styles.entryText} numberOfLines={4}>
                        {e.text}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.position == null && b.position == null) {
      return a.created_at.localeCompare(b.created_at);
    }
    if (a.position == null) return 1;
    if (b.position == null) return -1;
    return a.position - b.position;
  });
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
  loadingWrap: { paddingTop: spacing.xxxl, alignItems: 'center' },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 880,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  videoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  thumb: {
    width: 96,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
  },
  videoTitle: { ...typography.bodyBold, color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12 },
  entries: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    minWidth: 64,
    justifyContent: 'center',
  },
  stampDisabled: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stampText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  entryText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 19 },
});
