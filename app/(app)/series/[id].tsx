import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/Toast';
import { fetchSeriesById, fetchSeriesVideos } from '@/lib/api';
import { listContinueWatching, percentWatched } from '@/lib/progress';
import { useAuth } from '@/lib/auth';
import { thumb } from '@/lib/image';
import type { Series, Video } from '@/lib/supabase';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { formatDuration } from '@/lib/format';

function fmtTotal(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function SeriesDetail() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [series, setSeries] = useState<Series | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSeriesById(String(id)), fetchSeriesVideos(String(id))])
      .then(async ([s, vs]) => {
        setSeries(s);
        setVideos(vs);
        if (user) {
          const progress = await listContinueWatching(user.id, 100).catch(() => []);
          const map: Record<string, number> = {};
          for (const p of progress) {
            map[p.video_id] = percentWatched(p);
          }
          setProgressMap(map);
        }
      })
      .catch((e) => toast.error(e?.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [id, user]);

  const title = useMemo(
    () => (series ? (i18n.language === 'es' ? series.title_es : series.title_en) : ''),
    [series, i18n.language]
  );
  const desc = useMemo(
    () =>
      series ? (i18n.language === 'es' ? series.description_es : series.description_en) : null,
    [series, i18n.language]
  );

  const totalSeconds = videos.reduce((s, v) => s + (v.duration_seconds ?? 0), 0);
  const watchedCount = videos.filter((v) => (progressMap[v.id] ?? 0) >= 90).length;
  const overallPercent = videos.length
    ? Math.round(
        (videos.reduce((s, v) => s + Math.min(progressMap[v.id] ?? 0, 100), 0) /
          (videos.length * 100)) *
          100
      )
    : 0;

  const firstUnwatched = videos.find((v) => (progressMap[v.id] ?? 0) < 90) ?? videos[0];

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.text} style={{ marginTop: spacing.xxl }} />
      </Screen>
    );
  }
  if (!series) {
    return (
      <Screen>
        <Text style={{ color: colors.text }}>{t('notFound.title')}</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          {series.thumbnail_url ? (
            <Image
              source={thumb(series.thumbnail_url, 1280, { quality: 75 })}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : null}
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.seriesBadge}>
              <Ionicons name="albums" size={11} color="#fff" />
              <Text style={styles.seriesBadgeText}>{t('series.label')}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.meta}>
              {videos.length} {t('series.lessons', { count: videos.length })}
              {totalSeconds ? ` · ${fmtTotal(totalSeconds)}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Progress bar + play button */}
          {videos.length > 0 ? (
            <View style={styles.progressCard}>
              <View style={styles.progressInfo}>
                <View style={styles.progressBarOuter}>
                  <View style={[styles.progressBarInner, { width: `${overallPercent}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                  {t('series.completed', { done: watchedCount, total: videos.length, pct: overallPercent })}
                </Text>
              </View>
              {firstUnwatched ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/videos/play/[id]',
                      params: { id: firstUnwatched.id, from: `/series/${id}` },
                    })
                  }
                  style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.playBtnText}>
                    {watchedCount === 0
                      ? t('series.start')
                      : watchedCount === videos.length
                      ? t('series.rewatch')
                      : t('series.continue')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Description */}
          {desc ? (
            <View style={styles.descCard}>
              <Text style={styles.cardTitle}>{t('series.about')}</Text>
              <Text style={styles.desc}>{desc}</Text>
            </View>
          ) : null}

          {/* Lessons list */}
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.sectionTitle}>{t('series.lessonsTitle')}</Text>
            {videos.map((v, idx) => {
              const vTitle = i18n.language === 'es' ? v.title_es : v.title_en;
              const pct = progressMap[v.id] ?? 0;
              const completed = pct >= 90;
              return (
                <Pressable
                  key={v.id}
                  onPress={() =>
                    router.push({
                      pathname: '/videos/play/[id]',
                      params: { id: v.id, from: `/series/${id}` },
                    })
                  }
                  style={({ pressed }) => [styles.lessonRow, pressed && { opacity: 0.85 }]}
                >
                  <View style={[styles.lessonNum, completed && styles.lessonNumDone]}>
                    {completed ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Text style={styles.lessonNumText}>{idx + 1}</Text>
                    )}
                  </View>
                  <Image source={thumb(v.thumbnail_url, 200)} style={styles.lessonThumb} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={styles.lessonTitle}>{vTitle}</Text>
                    <View style={styles.lessonMetaRow}>
                      <Ionicons name="time" size={11} color={colors.textMuted} />
                      <Text style={styles.lessonMeta}>{formatDuration(v.duration_seconds)}</Text>
                      {pct > 0 && pct < 90 ? (
                        <Text style={[styles.lessonMeta, { color: colors.primary }]}>
                          · {t('series.watchedPct', { pct })}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons
                    name={completed ? 'refresh' : 'play-circle'}
                    size={26}
                    color={completed ? colors.textMuted : colors.primary}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const HERO_HEIGHT = 280;

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxxl },
  hero: {
    height: HERO_HEIGHT,
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  topBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { padding: spacing.lg, gap: 6 },
  seriesBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  seriesBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    ...typography.h1,
    color: '#fff',
    fontSize: 26,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  meta: {
    color: '#fff',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  body: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    marginTop: -spacing.md,
  },

  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.card,
  },
  progressInfo: { flex: 1, gap: 6 },
  progressBarOuter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressBarInner: { height: '100%', backgroundColor: colors.primary },
  progressLabel: { color: colors.textMuted, ...typography.caption, fontSize: 11 },

  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  playBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  descCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  desc: { color: colors.text, lineHeight: 22 },

  sectionTitle: { ...typography.h3, color: colors.text },

  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  lessonNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonNumDone: { backgroundColor: '#10B981' },
  lessonNumText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  lessonThumb: { width: 88, height: 50, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  lessonTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14, lineHeight: 18 },
  lessonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  lessonMeta: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
});
