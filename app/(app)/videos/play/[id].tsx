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
import { Stack, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { NativeVideoPlayer, Video } from '@/components/NativeVideoPlayer';
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
import { thumb } from '@/lib/image';
import { useSmartBack, useSystemBack } from '@/lib/navHistory';
import { getProgress, percentWatched, saveProgress } from '@/lib/progress';
import { shareItem } from '@/lib/share';
import { haptics } from '@/lib/haptics';
import type { Video as VideoT, VideoCategory } from '@/lib/supabase';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { formatBytes, formatDuration } from '@/lib/format';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export default function VideoPlayer() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const smartBack = useSmartBack();
  const isFocused = useIsFocused();
  const currentPath = usePathname();
  const toast = useToast();
  const { user } = useAuth();
  const audio = useAudioPlayer();
  const downloads = useDownloads();
  const { id, t: tParam, from } = useLocalSearchParams<{
    id: string;
    t?: string;
    from?: string;
  }>();
  const handoffAppliedRef = useRef(false);
  const [video, setVideo] = useState<VideoT | null>(null);
  const [category, setCategory] = useState<VideoCategory | null>(null);
  const [related, setRelated] = useState<VideoT[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [speedSheetOpen, setSpeedSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [ended, setEnded] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const ref = useRef<Video | null>(null);
  const webRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleHideControls() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setControlsVisible(false);
    }, 2500);
  }
  function revealControls() {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setControlsVisible(true);
  }
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      // Defensive: pause on unmount so the audio doesn't keep going if React
      // hasn't yet torn down the underlying element (mostly relevant on native).
      if (Platform.OS === 'web' && webRef.current) {
        try { webRef.current.pause(); } catch {}
      } else if (ref.current) {
        ref.current.pauseAsync().catch(() => {});
      }
    };
  }, []);

  // Tabs don't unmount screens when switching, so the cleanup above doesn't
  // fire when the user taps another tab. Pause whenever the screen loses
  // focus OR when the URL pathname moves away from this player. Belt and
  // suspenders — different navigators report blur in different ways.
  useEffect(() => {
    const onThisPlayer = currentPath?.includes(`/videos/play/${id}`) ?? false;
    if (isFocused && onThisPlayer) return;
    if (Platform.OS === 'web' && webRef.current) {
      try { webRef.current.pause(); } catch {}
    } else if (ref.current) {
      ref.current.pauseAsync().catch(() => {});
    }
  }, [isFocused, currentPath, id]);

  function goBack() {
    // Pause first so the video doesn't keep playing while we navigate.
    if (Platform.OS === 'web' && webRef.current) {
      try { webRef.current.pause(); } catch {}
    } else if (ref.current) {
      ref.current.pauseAsync().catch(() => {});
    }
    // Prefer the explicit `from` param passed by the caller (e.g. series
    // detail page passes ?from=/series/abc). Either way, smartBack pops
    // the videos tab's Stack to its root before navigating, so revisiting
    // the videos tab later doesn't show this player still mounted.
    let target: string | undefined;
    if (from) {
      target = from;
      try {
        if (target.includes('%')) target = decodeURIComponent(target);
      } catch {}
    }
    smartBack('/videos', target);
  }

  useSystemBack(goBack);

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
        // ?t=seconds wins over the saved-progress prompt — the user came
        // from a note/bookmark explicitly asking to land at that timestamp.
        const explicitT = tParam ? Math.max(0, Math.floor(Number(tParam))) : 0;
        if (explicitT > 0) {
          setResumeAt(explicitT);
          setCurrentSeconds(explicitT);
          setShowResumePrompt(false);
        } else if (prog && prog.position_seconds > 5) {
          setSavedProgress(prog.position_seconds);
          setProgressPercent(percentWatched(prog));
          setShowResumePrompt(true);
        }
      })
      .catch(() => toast.error(t('common.loadFailed')))
      .finally(() => setLoading(false));
  }, [id, user, tParam]);

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
      setShowResumePrompt(false);
    }
  }, [id, audio]);

  function playNow() {
    if (Platform.OS === 'web' && webRef.current) {
      webRef.current.play().catch(() => {});
    } else if (ref.current) {
      ref.current.playAsync().catch(() => {});
    }
  }

  function onResume() {
    if (savedProgress != null) {
      setResumeAt(savedProgress);
      setCurrentSeconds(savedProgress);
    }
    setShowResumePrompt(false);
    setTimeout(playNow, 50);
  }

  function onStartOver() {
    setResumeAt(0);
    setCurrentSeconds(0);
    setProgressPercent(0);
    setShowResumePrompt(false);
    setTimeout(() => {
      if (Platform.OS === 'web' && webRef.current) {
        webRef.current.currentTime = 0;
      } else if (ref.current) {
        ref.current.setPositionAsync(0).catch(() => {});
      }
      playNow();
    }, 50);
  }

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
      goBack();
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
                poster={thumb(video.thumbnail_url, 1280, { quality: 75 })}
                controls
                playsInline
                onPlay={scheduleHideControls}
                onPlaying={scheduleHideControls}
                onTimeUpdate={(e) => persist(e.currentTarget.currentTime, e.currentTarget.duration || 0)}
                onPause={(e) => {
                  revealControls();
                  persist(e.currentTarget.currentTime, e.currentTarget.duration || 0);
                }}
                onEnded={() => {
                  revealControls();
                  setEnded(true);
                }}
                style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
              />
            ) : (
              <NativeVideoPlayer
                ref={ref}
                uri={videoUri}
                rate={speed}
                resumeAtSeconds={resumeAt}
                onStatus={(status) => {
                  if (!status?.isLoaded) {
                    const err = (status as any)?.error;
                    if (err) setPlaybackError(String(err));
                    return;
                  }
                  if (playbackError) setPlaybackError(null);
                  persist(
                    (status.positionMillis ?? 0) / 1000,
                    (status.durationMillis ?? 0) / 1000
                  );
                  if (status.isPlaying) {
                    if (controlsVisible && !hideTimerRef.current) scheduleHideControls();
                  } else if (!controlsVisible) {
                    revealControls();
                  }
                  if (status.didJustFinish) {
                    revealControls();
                    setEnded(true);
                  }
                }}
                style={styles.player}
              />
            )}
            {playbackError ? (
              <View style={styles.errorOverlay} pointerEvents="box-none">
                <Ionicons name="warning" size={32} color="#fff" />
                <Text style={styles.errorTitle}>Playback error</Text>
                <Text style={styles.errorMsg} selectable>
                  {playbackError}
                </Text>
                <Text style={styles.errorUri} selectable numberOfLines={3}>
                  {videoUri}
                </Text>
              </View>
            ) : null}
          </View>

          {controlsVisible ? (
            <View style={styles.topBar} pointerEvents="box-none">
              <Pressable
                onPress={goBack}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                style={styles.topBtn}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
            </View>
          ) : null}

          {progressPercent > 0 && progressPercent < 100 ? (
            <View style={styles.progressOuter}>
              <View
                style={[styles.progressInner, { width: `${progressPercent}%` }]}
              />
            </View>
          ) : null}

          {showResumePrompt && savedProgress != null ? (
            <View style={styles.resumeOverlay}>
              <Image
                source={thumb(video.thumbnail_url, 1280, { quality: 75 })}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              <View style={styles.resumeScrim} />
              <View style={styles.resumeContent}>
                <Text style={styles.resumeTitle}>{t('videos.resumeTitle')}</Text>
                <Text style={styles.resumeSub}>
                  {t('videos.resumeSubtitle', {
                    time: formatDuration(savedProgress),
                  })}
                </Text>
                <View style={styles.resumeProgressBar}>
                  <View
                    style={[
                      styles.resumeProgressFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                </View>
                <View style={styles.resumeBtns}>
                  <Pressable
                    onPress={() => {
                      haptics.medium();
                      onResume();
                    }}
                    style={({ pressed }) => [
                      styles.resumeBtn,
                      styles.resumeBtnPrimary,
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.resumeBtnPrimaryText}>
                      {t('videos.resume')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      haptics.light();
                      onStartOver();
                    }}
                    style={({ pressed }) => [
                      styles.resumeBtn,
                      styles.resumeBtnSecondary,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.resumeBtnSecondaryText}>
                      {t('videos.startOver')}
                    </Text>
                  </Pressable>
                </View>
              </View>
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
              onPress={() => {
                haptics.light();
                onShare();
              }}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="share-social-outline" size={20} color={colors.text} />
              </View>
              <Text style={styles.actionLabel}>{t('videos.share')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.light();
                setMoreSheetOpen(true);
              }}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
              accessibilityLabel={t('videos.more')}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
              </View>
              <Text style={styles.actionLabel}>{t('videos.more')}</Text>
            </Pressable>
          </View>

          <BottomSheet
            visible={moreSheetOpen}
            onClose={() => setMoreSheetOpen(false)}
            title={t('videos.more')}
          >
            <Pressable
              onPress={() => {
                haptics.light();
                setMoreSheetOpen(false);
                setSpeedSheetOpen(true);
              }}
              style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name="speedometer-outline" size={18} color={colors.text} />
              </View>
              <Text style={styles.menuLabel}>{t('videos.playbackSpeed')}</Text>
              <Text style={styles.menuValue}>
                {speed === 1 ? t('videos.normal') : `${speed}x`}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.medium();
                setMoreSheetOpen(false);
                minimizeToAudio();
              }}
              style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name="headset-outline" size={18} color={colors.text} />
              </View>
              <Text style={styles.menuLabel}>{t('videos.listenAudio')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </BottomSheet>

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

          <VideoNotes videoId={video.id} currentSeconds={currentSeconds} onSeek={seekTo} />

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
  heroWrap: { backgroundColor: '#000', alignItems: 'center' },
  playerWrap: {
    width: '100%',
    maxWidth: 1100,
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  player: { width: '100%', height: '100%' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: spacing.sm,
    zIndex: 20,
  },
  topBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 21,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180,30,30,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    zIndex: 30,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorMsg: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorUri: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  resumeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  resumeScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,11,20,0.72)',
  },
  resumeContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  resumeTitle: {
    ...typography.h1,
    color: '#fff',
    fontSize: 22,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  resumeSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  resumeProgressBar: {
    width: '70%',
    maxWidth: 320,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  resumeProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  resumeBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  resumeBtnPrimary: {
    backgroundColor: colors.primary,
    ...shadow.card,
  },
  resumeBtnPrimaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  resumeBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  resumeBtnSecondaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
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
  body: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
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
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { ...typography.body, color: colors.text, flex: 1, fontWeight: '600' },
  menuValue: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
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
