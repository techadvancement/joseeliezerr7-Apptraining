import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ResizeMode, Video } from 'expo-av';
import { Screen } from '@/components/ui/Screen';
import { BookmarkButton } from '@/components/BookmarkButton';
import { BottomSheet, BottomSheetOption } from '@/components/BottomSheet';
import { DownloadButton } from '@/components/DownloadButton';
import { VideoCard } from '@/components/VideoCard';
import { VideoNotes } from '@/components/VideoNotes';
import { VideoChapters } from '@/components/VideoChapters';
import { UpNextOverlay } from '@/components/UpNextOverlay';
import { SectionHeader } from '@/components/SectionHeader';
import { useToast } from '@/components/Toast';
import {
  fetchCategory,
  fetchRelatedVideos,
  fetchVideo,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAudioPlayer } from '@/lib/audioPlayer';
import { useDownloads } from '@/lib/downloads';
import { getProgress, percentWatched, saveProgress } from '@/lib/progress';
import { shareItem } from '@/lib/share';
import type { Video as VideoT, VideoCategory } from '@/lib/supabase';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { formatBytes, formatDuration } from '@/lib/format';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export default function VideoPlayer() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const audio = useAudioPlayer();
  const downloads = useDownloads();
  const { id } = useLocalSearchParams<{ id: string }>();
  const handoffAppliedRef = useRef(false);
  const [video, setVideo] = useState<VideoT | null>(null);
  const [category, setCategory] = useState<VideoCategory | null>(null);
  const [related, setRelated] = useState<VideoT[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [speedSheetOpen, setSpeedSheetOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [ended, setEnded] = useState(false);
  const ref = useRef<Video | null>(null);
  const webRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    setEnded(false);
    fetchVideo(String(id))
      .then(async (v) => {
        setVideo(v);
        if (!v) return;
        const [cat, rel, prog] = await Promise.all([
          fetchCategory(v.category_id).catch(() => null),
          fetchRelatedVideos(v.category_id, v.id, 6).catch(() => []),
          user ? getProgress(user.id, v.id).catch(() => null) : Promise.resolve(null),
        ]);
        setCategory(cat);
        setRelated(rel);
        if (prog && prog.position_seconds > 5) {
          setResumeAt(prog.position_seconds);
          setProgressPercent(percentWatched(prog));
          setCurrentSeconds(prog.position_seconds);
        }
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    if (Platform.OS === 'web' && webRef.current) {
      webRef.current.playbackRate = speed;
    } else if (ref.current) {
      ref.current.setRateAsync(speed, true).catch(() => {});
    }
  }, [speed]);

  useEffect(() => {
    if (handoffAppliedRef.current) return;
    if (!audio.track) return;
    handoffAppliedRef.current = true;
    const sameTrack = String(audio.track.id) === String(id);
    const pos = audio.position;
    audio.stop();
    if (sameTrack && pos > 5) {
      setResumeAt(pos);
      setCurrentSeconds(pos);
    }
  }, [id, audio]);

  function seekTo(seconds: number) {
    setCurrentSeconds(seconds);
    if (Platform.OS === 'web' && webRef.current) {
      webRef.current.currentTime = seconds;
      webRef.current.play().catch(() => {});
    } else if (ref.current) {
      ref.current.setPositionAsync(seconds * 1000).catch(() => {});
      ref.current.playAsync().catch(() => {});
    }
  }

  async function persist(pos: number, dur: number) {
    setCurrentSeconds(pos);
    if (!user || !video) return;
    if (!Number.isFinite(pos) || !Number.isFinite(dur) || dur <= 0) return;
    setProgressPercent(Math.min(100, Math.round((pos / dur) * 100)));
    const now = Date.now();
    if (now - lastSavedRef.current < 5000) return;
    lastSavedRef.current = now;
    await saveProgress(user.id, video.id, pos, dur).catch(() => {});
  }

  async function onShare() {
    if (!video) return;
    const title = i18n.language === 'es' ? video.title_es : video.title_en;
    try {
      await shareItem({ title, path: `/videos/play/${video.id}` });
    } catch (err: any) {
      toast.error(err?.message ?? 'Share failed');
    }
  }

  async function minimizeToAudio() {
    if (!video) return;
    let pos = currentSeconds;
    if (Platform.OS === 'web' && webRef.current) {
      pos = webRef.current.currentTime || pos;
      webRef.current.pause();
    } else if (ref.current) {
      const status = await ref.current.getStatusAsync().catch(() => null);
      if (status && status.isLoaded) {
        pos = (status.positionMillis ?? 0) / 1000;
      }
      await ref.current.pauseAsync().catch(() => {});
    }
    handoffAppliedRef.current = true;
    try {
      await audio.play(video, pos);
      router.back();
    } catch (e: any) {
      toast.error(e?.message ?? 'Audio error');
    }
  }

  const upNext = related[0] ?? null;

  function playUpNext() {
    if (!upNext) return;
    router.replace(`/videos/play/${upNext.id}`);
  }

  const title = useMemo(
    () => (video ? (i18n.language === 'es' ? video.title_es : video.title_en) : ''),
    [video, i18n.language]
  );
  const desc = useMemo(
    () =>
      video ? (i18n.language === 'es' ? video.description_es : video.description_en) : null,
    [video, i18n.language]
  );
  const categoryName = useMemo(
    () => (category ? (i18n.language === 'es' ? category.name_es : category.name_en) : ''),
    [category, i18n.language]
  );
  const longDesc = (desc?.length ?? 0) > 180;
  const videoUri = video ? downloads.getLocalUri(video.id) ?? video.video_url : '';

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.text} style={{ marginTop: spacing.xxl }} />
      </Screen>
    );
  }

  if (!video) {
    return (
      <Screen>
        <Text style={{ color: colors.text }}>Not found</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroWrap}>
          <View style={styles.playerWrap}>
            {Platform.OS === 'web' ? (
              <video
                ref={(el) => {
                  webRef.current = el;
                  if (el) {
                    el.playbackRate = speed;
                    if (resumeAt && el.currentTime < 1) {
                      el.currentTime = resumeAt;
                      setResumeAt(null);
                    }
                  }
                }}
                src={videoUri}
                poster={video.thumbnail_url}
                controls
                playsInline
                onTimeUpdate={(e) => persist(e.currentTarget.currentTime, e.currentTarget.duration || 0)}
                onPause={(e) => persist(e.currentTarget.currentTime, e.currentTarget.duration || 0)}
                onEnded={() => setEnded(true)}
                style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
              />
            ) : (
              <Video
                ref={ref}
                source={{ uri: videoUri }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                rate={speed}
                positionMillis={(resumeAt ?? 0) * 1000}
                onPlaybackStatusUpdate={(status) => {
                  if (!status.isLoaded) return;
                  persist(
                    (status.positionMillis ?? 0) / 1000,
                    (status.durationMillis ?? 0) / 1000
                  );
                  if (status.didJustFinish) setEnded(true);
                }}
                style={styles.player}
              />
            )}
          </View>

          <View style={styles.topBar} pointerEvents="box-none">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.topBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={minimizeToAudio}
              hitSlop={12}
              style={styles.topBtn}
              accessibilityLabel={t('videos.listenAudio')}
            >
              <Ionicons name="headset" size={20} color="#fff" />
            </Pressable>
          </View>

          {progressPercent > 0 && progressPercent < 100 ? (
            <View style={styles.progressOuter}>
              <View
                style={[styles.progressInner, { width: `${progressPercent}%` }]}
              />
            </View>
          ) : null}

          {ended && upNext ? (
            <UpNextOverlay
              next={upNext}
              onPlayNow={playUpNext}
              onCancel={() => setEnded(false)}
            />
          ) : null}
        </View>

        <View style={styles.body}>
          {categoryName ? (
            <Text style={styles.eyebrow}>{categoryName.toUpperCase()}</Text>
          ) : null}

          <Text style={styles.title}>{title}</Text>

          {video.instructor ? (
            <View style={styles.instructorRow}>
              <View style={styles.instructorAvatar}>
                <Text style={styles.instructorInitial}>
                  {video.instructor[0]?.toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.instructorLabel}>
                  {t('videos.instructor')}
                </Text>
                <Text style={styles.instructorName}>{video.instructor}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="time" size={12} color={colors.textMuted} />
              <Text style={styles.meta}>
                {formatDuration(video.duration_seconds)}
              </Text>
            </View>
            {video.resolution ? (
              <View style={styles.metaPill}>
                <Ionicons name="film" size={12} color={colors.textMuted} />
                <Text style={styles.meta}>{video.resolution}</Text>
              </View>
            ) : null}
            {video.size_bytes ? (
              <View style={styles.metaPill}>
                <Ionicons name="cloud-download" size={12} color={colors.textMuted} />
                <Text style={styles.meta}>{formatBytes(video.size_bytes)}</Text>
              </View>
            ) : null}
            {progressPercent > 0 && progressPercent < 100 ? (
              <View style={styles.metaPill}>
                <Ionicons name="play-circle" size={12} color={colors.primary} />
                <Text style={[styles.meta, { color: colors.primary }]}>
                  {progressPercent}% {t('videos.watched')}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.action}>
              <BookmarkButton type="video" id={video.id} size={20} />
              <Text style={styles.actionLabel}>{t('videos.save')}</Text>
            </View>
            <View style={styles.action}>
              <DownloadButton video={video} iconSize={20} />
              <Text style={styles.actionLabel}>
                {downloads.status(video.id).state === 'done'
                  ? t('videos.downloaded')
                  : downloads.status(video.id).state === 'downloading'
                  ? t('videos.downloading')
                  : t('videos.download')}
              </Text>
            </View>
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="share-social-outline" size={20} color={colors.text} />
              </View>
              <Text style={styles.actionLabel}>{t('videos.share')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setSpeedSheetOpen(true)}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="speedometer-outline" size={20} color={colors.text} />
              </View>
              <Text style={styles.actionLabel}>{speed}x</Text>
            </Pressable>
          </View>

          <BottomSheet
            visible={speedSheetOpen}
            onClose={() => setSpeedSheetOpen(false)}
            title={t('videos.playbackSpeed')}
          >
            {SPEEDS.map((s) => (
              <BottomSheetOption
                key={s}
                label={s === 1 ? t('videos.normal') : `${s}x`}
                selected={s === speed}
                onPress={() => {
                  setSpeed(s);
                  setSpeedSheetOpen(false);
                }}
              />
            ))}
          </BottomSheet>

          {desc ? (
            <View style={styles.descCard}>
              <Text style={styles.cardTitle}>{t('videos.about')}</Text>
              <Text
                style={styles.desc}
                numberOfLines={!descExpanded && longDesc ? 4 : undefined}
              >
                {desc}
              </Text>
              {longDesc ? (
                <Pressable onPress={() => setDescExpanded((v) => !v)}>
                  <Text style={styles.descToggle}>
                    {descExpanded ? t('videos.showLess') : t('videos.showMore')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {video.chapters && video.chapters.length > 0 ? (
            <VideoChapters
              chapters={video.chapters}
              currentSeconds={currentSeconds}
              onSeek={seekTo}
            />
          ) : null}

          <VideoNotes videoId={video.id} />

          {related.length > 0 ? (
            <View style={styles.relatedWrap}>
              <SectionHeader
                title={
                  categoryName
                    ? t('videos.moreIn', { category: categoryName })
                    : t('videos.relatedTitle')
                }
              />
              <FlatList
                data={related}
                horizontal
                keyExtractor={(v) => v.id}
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{
                  gap: spacing.lg,
                  paddingRight: spacing.lg,
                  alignItems: 'flex-start',
                }}
                renderItem={({ item }) => <VideoCard video={item} size="md" />}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxxl },
  heroWrap: { backgroundColor: '#000' },
  playerWrap: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  player: { width: '100%', height: '100%' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressOuter: {
    height: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  body: { padding: spacing.lg, gap: spacing.lg },
  eyebrow: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 11,
  },
  title: { ...typography.h1, color: colors.text, fontSize: 26, marginTop: -spacing.xs },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorInitial: { color: '#fff', fontSize: 18, fontWeight: '800' },
  instructorLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  instructorName: { ...typography.bodyBold, color: colors.text },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meta: { ...typography.caption, color: colors.textMuted },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
  },
  action: { alignItems: 'center', gap: 6, flex: 1 },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { ...typography.caption, color: colors.textMuted },
  descCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  desc: { color: colors.text, lineHeight: 22 },
  descToggle: { color: colors.primary, fontWeight: '700', marginTop: 2 },
  relatedWrap: { gap: spacing.sm },
});
