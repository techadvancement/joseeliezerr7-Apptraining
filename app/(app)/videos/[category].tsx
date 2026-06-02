import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { VideoCard } from '@/components/VideoCard';
import { VideoCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { fetchCategories, fetchVideos } from '@/lib/api';
import { useResponsive } from '@/lib/responsive';
import type { Video, VideoCategory } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

export default function CategoryVideos() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { columns } = useResponsive();
  const { category } = useLocalSearchParams<{ category: string }>();
  const [cat, setCat] = useState<VideoCategory | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCategories(), fetchVideos(category)])
      .then(([cs, vs]) => {
        setCat(cs.find((c) => c.slug === category) ?? null);
        setVideos(vs);
      })
      .catch(() => toast.error(t('common.loadFailed')))
      .finally(() => setLoading(false));
  }, [category]);

  const title = cat
    ? i18n.language === 'es'
      ? cat.name_es
      : cat.name_en
    : '';

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>

      {loading ? (
        <View style={styles.skelGrid}>
          {Array.from({ length: columns * 3 }).map((_, i) => (
            <View key={i} style={{ width: `${100 / columns - 2}%` }}>
              <VideoCardSkeleton width={160} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          key={`cols-${columns}`}
          data={videos}
          keyExtractor={(v) => v.id}
          numColumns={columns}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <VideoCard video={item} size="sm" fullWidth />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('videos.empty')}</Text>
          }
        />
      )}
    </Screen>
  );
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
  back: { padding: 4 },
  title: { ...typography.h2, color: colors.text },
  grid: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  skelGrid: {
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
});
