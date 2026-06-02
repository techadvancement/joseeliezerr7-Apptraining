import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Link, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { formatDuration } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { thumb } from '@/lib/image';
import type { Video } from '@/lib/supabase';

export function FeaturedHero({ video }: { video: Video }) {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const lang = i18n.language;
  const title = lang === 'es' ? video.title_es : video.title_en;

  return (
    <Link
      href={{
        pathname: '/videos/play/[id]',
        params: { id: video.id, from: pathname || '/' },
      }}
      asChild
    >
      <Pressable
        onPressIn={() => haptics.medium()}
        accessibilityRole="button"
        accessibilityLabel={`${t('a11y.play')}: ${title}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={thumb(video.thumbnail_url, 1280, { quality: 75 })}
            contentFit="cover"
            transition={250}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.topBadge}>
            <Ionicons name="star" size={11} color="#fff" />
            <Text style={styles.topBadgeText}>{t('home.featured')}</Text>
          </View>
        </View>

        <View style={styles.bottomContent}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.metaRow}>
              {video.instructor ? (
                <>
                  <Text style={styles.meta}>{video.instructor}</Text>
                  <Text style={styles.metaDot}>·</Text>
                </>
              ) : null}
              <Ionicons name="time" size={11} color={colors.textMuted} />
              <Text style={styles.meta}>{formatDuration(video.duration_seconds)}</Text>
            </View>
          </View>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={22} color="#fff" />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    ...shadow.card,
  },
  pressed: { opacity: 0.95 },
  imageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  topBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  topBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  bottomContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
});
