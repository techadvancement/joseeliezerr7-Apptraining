import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { thumb } from '@/lib/image';
import type { VideoCategory } from '@/lib/supabase';

type Variant = 'tile' | 'feature';

export function CategoryTile({
  category,
  variant = 'tile',
  count,
}: {
  category: VideoCategory;
  variant?: Variant;
  count?: number;
}) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const name = i18n.language === 'es' ? category.name_es : category.name_en;

  if (variant === 'feature') {
    return (
      <Pressable
        onPress={() => router.push(`/videos/${category.slug}`)}
        style={({ pressed }) => [styles.feature, pressed && styles.pressed]}
      >
        {category.thumbnail_url ? (
          <Image
            source={thumb(category.thumbnail_url, 1280, { quality: 75 })}
            contentFit="cover"
            transition={200}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]} />
        )}
        <View style={styles.featureScrim} />
        <View style={styles.featureContent}>
          <Text style={styles.featureLabel}>{name}</Text>
          <View style={styles.featureMetaRow}>
            <View style={styles.featureCount}>
              <Ionicons name="play" size={11} color="#fff" />
              {typeof count === 'number' ? (
                <Text style={styles.featureCountText}>{count}</Text>
              ) : null}
            </View>
            <View style={styles.featureCta}>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(`/videos/${category.slug}`)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      {category.thumbnail_url ? (
        <Image
          source={thumb(category.thumbnail_url, 640)}
          contentFit="cover"
          transition={200}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} />
      )}
      <View style={styles.scrim} />
      <Text style={styles.label}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '100%',
    height: '100%',
    minHeight: 120,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  pressed: { opacity: 0.9 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,15,26,0.45)',
  },
  fallback: { backgroundColor: colors.surfaceAlt },
  label: { ...typography.h3, color: '#fff' },

  // Feature variant — full-width hero
  feature: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    justifyContent: 'flex-end',
    ...shadow.card,
  },
  featureScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,15,26,0.55)',
  },
  featureContent: { padding: spacing.lg, gap: spacing.sm },
  featureLabel: { ...typography.h2, color: '#fff', fontSize: 22, letterSpacing: -0.3 },
  featureMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featureCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.sm,
  },
  featureCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  featureCta: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
