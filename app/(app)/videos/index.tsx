import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { CategoryChip } from '@/components/CategoryChip';
import { VideoCard } from '@/components/VideoCard';
import { SeriesCard } from '@/components/SeriesCard';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { VideoCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { fetchCategories, fetchSeries, fetchVideos } from '@/lib/api';
import type { Series, Video, VideoCategory } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

export default function VideosIndex() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, v, s] = await Promise.all([fetchCategories(), fetchVideos(), fetchSeries()]);
      setCategories(c);
      setVideos(v);
      setSeries(s);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load videos');
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    const lang = i18n.language as 'en' | 'es';
    const q = query.trim().toLowerCase();
    return videos.filter((v) => {
      if (selected && v.category_id !== selected) return false;
      if (!q) return true;
      const title = (lang === 'es' ? v.title_es : v.title_en).toLowerCase();
      return title.includes(q);
    });
  }, [selected, videos, query, i18n.language]);

  const showSeries = !query && !selected && series.length > 0;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('videos.title')}</Text>
          <Text style={styles.subtitle}>{t('videos.subtitle')}</Text>
          <View style={styles.searchWrap}>
            <SearchBar value={query} onChange={setQuery} />
          </View>
        </View>

        {/* Series section */}
        {showSeries ? (
          <View style={styles.seriesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('series.title')}</Text>
              <Text style={styles.sectionSub}>{t('series.subtitle')}</Text>
            </View>
            <FlatList
              data={series}
              horizontal
              keyExtractor={(s) => s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.seriesList}
              renderItem={({ item }) => <SeriesCard series={item} size="md" />}
            />
          </View>
        ) : null}

        {/* Category filter chips */}
        <View style={styles.chipsRow}>
          <FlatList
            data={[{ id: '__all', slug: '', name_en: '', name_es: '', thumbnail_url: null, order_index: 0 }, ...categories]}
            horizontal
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            renderItem={({ item }) =>
              item.id === '__all' ? (
                <CategoryChip
                  label={t('videos.allCategories')}
                  selected={selected === null}
                  onPress={() => setSelected(null)}
                />
              ) : (
                <CategoryChip
                  label={i18n.language === 'es' ? item.name_es : item.name_en}
                  selected={selected === item.id}
                  onPress={() => setSelected(item.id)}
                />
              )
            }
          />
        </View>

        {/* All videos grid */}
        {loading ? (
          <View style={styles.grid}>
            <View style={styles.row}>
              <View style={styles.tile}><VideoCardSkeleton width={160} /></View>
              <View style={styles.tile}><VideoCardSkeleton width={160} /></View>
            </View>
            <View style={styles.row}>
              <View style={styles.tile}><VideoCardSkeleton width={160} /></View>
              <View style={styles.tile}><VideoCardSkeleton width={160} /></View>
            </View>
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="videocam-outline"
            title={t('videos.empty')}
            description={query ? t('videos.emptySearch') : undefined}
          />
        ) : (
          <View style={styles.grid}>
            {Array.from({ length: Math.ceil(filtered.length / 2) }, (_, rowIdx) => (
              <View key={rowIdx} style={styles.row}>
                {filtered.slice(rowIdx * 2, rowIdx * 2 + 2).map((v) => (
                  <View key={v.id} style={styles.tile}>
                    <VideoCard video={v} size="sm" />
                  </View>
                ))}
                {filtered.slice(rowIdx * 2, rowIdx * 2 + 2).length === 1 ? (
                  <View style={styles.tile} />
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs },
  title: { ...typography.h1, color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  searchWrap: { marginTop: spacing.md },
  seriesSection: { marginTop: spacing.xl, gap: spacing.md },
  sectionHeader: { paddingHorizontal: spacing.lg, gap: 2 },
  sectionTitle: { ...typography.h2, color: colors.text, fontSize: 20 },
  sectionSub: { color: colors.textMuted, fontSize: 13 },
  seriesList: { paddingHorizontal: spacing.lg, gap: spacing.md },
  chipsRow: { marginTop: spacing.lg },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1 },
});
