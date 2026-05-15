import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { formatDuration } from '@/lib/format';
import type { Video } from '@/lib/supabase';

export function FeaturedHero({ video }: { video: Video }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const title = lang === 'es' ? video.title_es : video.title_en;

  return (
    <Link href={`/videos/play/${video.id}`} asChild>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={video.thumbnail_url}
            contentFit="cover"
            transition={250}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.scrimTop} />
          <View style={styles.scrimBottom} />

          <View style={styles.topBadge}>
            <Ionicons name="star" size={11} color="#fff" />
            <Text style={styles.topBadgeText}>{t('home.featured')}</Text>
          </View>

          <View style={styles.bottomContent}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={2} style={styles.title}>{title}</Text>
              <View style={styles.metaRow}>
                {video.instructor ? (
                  <>
                    <Text style={styles.meta}>{video.instructor}</Text>
                    <Text style={styles.metaDot}>·</Text>
                  </>
                ) : null}
                <Ionicons name="time" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={styles.meta}>{formatDuration(video.duration_seconds)}</Text>
              </View>
            </View>
            <View style={styles.playBtn}>
              <Ionicons name="play" size={22} color="#fff" />
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    ...shadow.card,
  },
  pressed: { opacity: 0.95 },
  imageWrap: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(11,15,26,0.35)',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: 'rgba(11,15,26,0.78)',
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
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    color: '#fff',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  meta: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '600' },
  metaDot: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
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
