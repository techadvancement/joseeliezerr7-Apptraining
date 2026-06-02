import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { thumb } from '@/lib/image';
import type { Series } from '@/lib/supabase';

type Size = 'sm' | 'md' | 'lg';

const sizeMap: Record<Size, { width: number; aspect: number }> = {
  sm: { width: 160, aspect: 16 / 9 },
  md: { width: 240, aspect: 16 / 9 },
  lg: { width: 320, aspect: 16 / 9 },
};

function fmtTotal(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function SeriesCard({ series, size = 'md' }: { series: Series; size?: Size }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const title = lang === 'es' ? series.title_es : series.title_en;
  const dims = sizeMap[size];
  const count = series.video_count ?? 0;

  return (
    <Link href={`/series/${series.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { width: dims.width },
          pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
        ]}
      >
        <View
          style={[
            styles.thumb,
            { width: dims.width, height: Math.round(dims.width / dims.aspect) },
          ]}
        >
          {series.thumbnail_url ? (
            <Image
              source={thumb(series.thumbnail_url, dims.width * 2)}
              contentFit="cover"
              transition={200}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceAlt }]} />
          )}
          <View style={styles.gradient} />
          <View style={styles.badgeRow}>
            <View style={styles.seriesBadge}>
              <Ionicons name="albums" size={11} color="#fff" />
              <Text style={styles.seriesBadgeText}>{t('series.label')}</Text>
            </View>
            {series.featured ? (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={10} color="#fff" />
              </View>
            ) : null}
          </View>
          <View style={styles.footerOverlay}>
            <Text style={styles.lessons}>
              {count} {t('series.lessons', { count })}
              {series.total_duration_seconds
                ? ` · ${fmtTotal(series.total_duration_seconds)}`
                : ''}
            </Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, flexShrink: 0 },
  thumb: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
    ...shadow.card,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // simulated bottom gradient using shadow trick — relies on overlay
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.sm,
  },
  seriesBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  featuredBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  lessons: { color: '#fff', fontSize: 11, fontWeight: '700' },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
});
