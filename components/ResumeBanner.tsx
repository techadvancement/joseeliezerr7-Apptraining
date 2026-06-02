import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '@/lib/responsive';
import { thumb } from '@/lib/image';
import { formatDuration } from '@/lib/format';
import { percentWatched, type Progress } from '@/lib/progress';
import type { Video } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Props = {
  video: Video;
  progress: Progress;
};

export function ResumeBanner({ video, progress }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const { isPhone } = useResponsive();
  const title = i18n.language === 'es' ? video.title_es : video.title_en;
  const pct = percentWatched(progress);

  function open() {
    router.push({
      pathname: '/videos/play/[id]',
      params: { id: video.id, from: pathname || '/' },
    });
  }

  const thumbNode = (
    <View style={[styles.thumbWrap, isPhone ? styles.thumbPhone : styles.thumbDesktop]}>
      {video.thumbnail_url ? (
        <Image
          source={thumb(video.thumbnail_url, isPhone ? 720 : 384)}
          style={styles.thumb}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.thumb, { backgroundColor: colors.surfaceAlt }]} />
      )}
      <View style={styles.thumbScrim} pointerEvents="none" />
      <View style={styles.playBadge} pointerEvents="none">
        <Ionicons name="play" size={isPhone ? 22 : 16} color="#fff" />
      </View>
    </View>
  );

  const bodyNode = (
    <View style={styles.body}>
      <Text style={styles.eyebrow}>{t('home.resumeEyebrow')}</Text>
      <Text numberOfLines={2} style={styles.title}>{title}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(2, pct)}%` }]} />
      </View>
      <Text style={styles.meta}>
        {formatDuration(progress.position_seconds)} / {formatDuration(progress.duration_seconds)}
        {' · '}
        {t('home.percentComplete', { percent: pct })}
      </Text>
    </View>
  );

  const ctaNode = (
    <View style={[styles.cta, isPhone && styles.ctaFull]}>
      <Ionicons name="play" size={15} color="#fff" />
      <Text style={styles.ctaText}>
        {t('home.resumeFromTime', { time: formatDuration(progress.position_seconds) })}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={t('home.resumeAccessibility', { title })}
      style={({ pressed, hovered }: any) => [
        styles.card,
        isPhone ? styles.cardPhone : styles.cardDesktop,
        hovered && styles.cardHovered,
        pressed && { opacity: 0.92 },
      ]}
    >
      {thumbNode}
      <View style={isPhone ? styles.bodyCol : styles.bodyRow}>
        {bodyNode}
        {ctaNode}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    overflow: 'hidden',
  },
  cardPhone: {
    // stacked: thumb on top, body+cta below
  },
  cardDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardHovered: {
    borderColor: colors.primary,
  },
  thumbWrap: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
  },
  thumbPhone: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbDesktop: {
    width: 192,
    height: 108,
    borderRadius: radius.md,
  },
  thumb: { width: '100%', height: '100%' },
  thumbScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -22 }, { translateY: -22 }],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyCol: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 17 },
  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: colors.bgElevated,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  meta: { color: colors.textMuted, fontSize: 13 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  ctaFull: { alignSelf: 'stretch' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
