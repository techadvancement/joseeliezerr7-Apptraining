import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { CategoryChip } from '@/components/CategoryChip';
import { VideoCard } from '@/components/VideoCard';
import { SeriesCard } from '@/components/SeriesCard';
import { SearchBar } from '@/components/SearchBar';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { VideoCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { fetchCategories, fetchSeries, fetchVideos } from '@/lib/api';
import { useResponsive } from '@/lib/responsive';
import { listContinueWatching } from '@/lib/progress';
import type { Series, Video, VideoCategory } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

export default function VideosIndex() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const { columns } = useResponsive();
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [continueVideos, setContinueVideos] = useState<Video[]>([]);
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
      if (user) {
        const progress = await listContinueWatching(user.id, 8).catch(() => []);
        const byId = new Map(v.map((x) => [x.id, x] as const));
        setContinueVideos(progress.map((p) => byId.get(p.video_id)).filter(Boolean) as Video[]);
      }
    } catch (err: any) {
      toast.error(err?.message ?? t('common.loadFailed'));
    }
  }, [toast, t, user]);

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

  const isBrowsing = !query && !selected;
  const showContinue = isBrowsing && continueVideos.length > 0;
  const showSeries = isBrowsing && series.length > 0;
  const selectedCategoryName = selected
    ? (() => {
        const c = categories.find((x) => x.id === selected);
        return c ? (i18n.language === 'es' ? c.name_es : c.name_en) : '';
      })()
    : '';
  const gridHeading = query
    ? t('videos.searchResults')
    : selectedCategoryName || t('videos.allVideos');

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

        {/* Continue watching rail */}
        {showContinue ? (
          <View style={styles.section}>
            <SectionHeader title={t('home.continueWatching')} />
            <FlatList
              data={continueVideos}
              horizontal
              keyExtractor={(v) => v.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item }) => <VideoCard video={item} size="md" />}
            />
          </View>
        ) : null}

        {/* Series rail */}
        {showSeries ? (
          <View style={styles.section}>
            <SectionHeader title={t('series.title')} />
            <Text style={styles.sectionSub}>{t('series.subtitle')}</Text>
            <FlatList
              data={series}
              horizontal
              keyExtractor={(s) => s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
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

        {/* Grid heading */}
        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>{gridHeading}</Text>
          {!loading && filtered.length > 0 ? (
            <Text style={styles.gridCount}>{filtered.length}</Text>
          ) : null}
        </View>

        {/* All videos grid */}
        {loading ? (
          <View style={styles.grid}>
            {Array.from({ length: 2 }, (_, rowIdx) => (
              <View key={rowIdx} style={styles.row}>
                {Array.from({ length: columns }).map((_, i) => (
                  <View key={i} style={styles.tile}>
                    <VideoCardSkeleton />
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="videocam-outline"
            title={t('videos.empty')}
            description={query ? t('videos.emptySearch') : undefined}
          />
        ) : (
          <View style={styles.grid}>
            {Array.from({ length: Math.ceil(filtered.length / columns) }, (_, rowIdx) => {
              const slice = filtered.slice(rowIdx * columns, rowIdx * columns + columns);
              const fillers = columns - slice.length;
              return (
                <View key={rowIdx} style={styles.row}>
                  {slice.map((v) => (
                    <View key={v.id} style={styles.tile}>
                      <VideoCard video={v} fullWidth />
                    </View>
                  ))}
                  {Array.from({ length: fillers }).map((_, i) => (
                    <View key={`f-${i}`} style={styles.tile} />
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  searchWrap: { marginTop: spacing.md },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.xl },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  rail: { paddingRight: spacing.lg, gap: spacing.lg, alignItems: 'flex-start' },
  chipsRow: { marginTop: spacing.lg },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  gridHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  gridTitle: { ...typography.h2, color: colors.text, fontSize: 18 },
  gridCount: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '700',
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1 },
});
