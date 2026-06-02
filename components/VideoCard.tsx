import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { formatBytes, formatDuration } from '@/lib/format';
import { useDownloads } from '@/lib/downloads';
import { thumb } from '@/lib/image';
import type { Video } from '@/lib/supabase';

type Size = 'sm' | 'md' | 'lg';

const sizeMap: Record<Size, { width: number; aspect: number }> = {
  sm: { width: 160, aspect: 16 / 9 },
  md: { width: 240, aspect: 16 / 9 },
  lg: { width: 320, aspect: 16 / 9 },
};

export function VideoCard({
  video,
  size = 'md',
  fullWidth = false,
}: {
  video: Video;
  size?: Size;
  fullWidth?: boolean;
}) {
  const { i18n, t } = useTranslation();
  const downloads = useDownloads();
  const pathname = usePathname();
  const lang = i18n.language;
  const title = lang === 'es' ? video.title_es : video.title_en;
  const dims = sizeMap[size];
  const downloaded = downloads.isDownloaded(video.id);

  return (
    <Link
      href={{
        pathname: '/videos/play/[id]',
        params: { id: video.id, from: pathname || '/' },
      }}
      asChild
    >
      <Pressable
        style={({ pressed }) => [
          styles.card,
          fullWidth ? { width: '100%' } : { width: dims.width },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.thumb,
            fullWidth
              ? { aspectRatio: dims.aspect }
              : { width: dims.width, height: Math.round(dims.width / dims.aspect) },
          ]}
        >
          <Image
            source={thumb(video.thumbnail_url, dims.width * 2)}
            contentFit="cover"
            transition={200}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.duration}>
            <Ionicons name="play" size={10} color="#fff" />
            <Text style={styles.durationText}>
              {formatDuration(video.duration_seconds)}
            </Text>
          </View>
          {video.resolution ? (
            <View style={styles.quality}>
              <Text style={styles.qualityText}>{video.resolution}</Text>
            </View>
          ) : null}
          {downloaded ? (
            <View style={styles.downloaded}>
              <Ionicons name="cloud-done" size={11} color="#fff" />
            </View>
          ) : null}
        </View>
        <View
          style={[
            styles.textWrap,
            fullWidth ? { width: '100%' } : { width: dims.width },
          ]}
        >
          <Text
            numberOfLines={5}
            style={[
              styles.title,
              fullWidth ? null : { width: dims.width },
            ]}
          >
            {title}
          </Text>
          <Text style={styles.meta}>
            {Math.round(video.duration_seconds / 60)} {t('videos.minutes')}
            {video.size_bytes ? ` · ${formatBytes(video.size_bytes)}` : ''}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, flexShrink: 0 },
  pressed: { opacity: 0.85 },
  thumb: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  duration: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  durationText: { color: '#fff', ...typography.caption },
  quality: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(91,124,250,0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  qualityText: { color: '#fff', ...typography.caption, fontWeight: '700' },
  downloaded: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    gap: 4,
  },
  title: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    minHeight: 36,
  },
  meta: { ...typography.caption, color: colors.textMuted },
});
