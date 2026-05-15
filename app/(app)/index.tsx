import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { VideoCard } from '@/components/VideoCard';
import { ManualCard } from '@/components/ManualCard';
import { CategoryTile } from '@/components/CategoryTile';
import { SeriesCard } from '@/components/SeriesCard';
import { FeaturedHero } from '@/components/FeaturedHero';
import { useAuth } from '@/lib/auth';
import {
  fetchCategories,
  fetchManuals,
  fetchSeries,
  fetchVideos,
  USING_MOCKS,
} from '@/lib/api';
import { listContinueWatching } from '@/lib/progress';
import type { Manual, Series, Video, VideoCategory } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [continueVideos, setContinueVideos] = useState<Video[]>([]);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [c, v, m, s] = await Promise.all([
      fetchCategories(),
      fetchVideos(),
      fetchManuals(),
      fetchSeries(),
    ]);
    setCategories(c);
    setVideos(v);
    setManuals(m.slice(0, 8));
    setSeries(s);

    if (user) {
      const progress = await listContinueWatching(user.id, 8).catch(() => []);
      const byId = new Map(v.map((x) => [x.id, x] as const));
      setContinueVideos(progress.map((p) => byId.get(p.video_id)).filter(Boolean) as Video[]);
    }
  }

  useEffect(() => {
    load().catch((e) => console.warn('home load error', e));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  const featured = videos[0];
  const latestVideos = useMemo(() => videos.slice(1, 7), [videos]);

  const { topCategory, topCategoryVideos, topCategoryCount, otherCategories } = useMemo(() => {
    if (!categories.length) {
      return {
        topCategory: null as VideoCategory | null,
        topCategoryVideos: [] as Video[],
        topCategoryCount: 0,
        otherCategories: [] as VideoCategory[],
      };
    }
    const counts = new Map<string, number>();
    for (const v of videos) {
      counts.set(v.category_id, (counts.get(v.category_id) ?? 0) + 1);
    }
    let topId: string | null = null;
    let max = 0;
    for (const [cid, cnt] of counts.entries()) {
      if (cnt > max) {
        max = cnt;
        topId = cid;
      }
    }
    const cat = topId ? categories.find((c) => c.id === topId) ?? null : null;
    const rest = cat ? categories.filter((c) => c.id !== cat.id) : categories;
    const railVideos = topId
      ? videos.slice(1).filter((v) => v.category_id === topId).slice(0, 6)
      : [];
    return {
      topCategory: cat,
      topCategoryVideos: railVideos,
      topCategoryCount: topId ? counts.get(topId) ?? 0 : 0,
      otherCategories: rest,
    };
  }, [categories, videos]);

  const topCategoryName = topCategory
    ? i18n.language === 'es'
      ? topCategory.name_es
      : topCategory.name_en
    : '';

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.greeting}>{t('home.title')}</Text>
            <Text style={styles.name}>{profile?.full_name ?? ''}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/search')}
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="search" size={22} color={colors.text} />
          </Pressable>
        </View>

        {USING_MOCKS ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Demo data — set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to connect Supabase.
            </Text>
          </View>
        ) : null}

        {featured ? <FeaturedHero video={featured} /> : null}

        {latestVideos.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('home.newVideos')}
              action={t('common.seeAll')}
              onActionPress={() => router.push('/videos')}
            />
            <FlatList
              data={latestVideos}
              horizontal
              keyExtractor={(v) => v.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.lg, paddingRight: spacing.lg, alignItems: 'flex-start' }}
              style={{ flexGrow: 0 }}
              renderItem={({ item }) => <VideoCard video={item} size="md" />}
            />
          </View>
        ) : null}

        {series.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('series.title')}
              action={t('common.seeAll')}
              onActionPress={() => router.push('/videos')}
            />
            <FlatList
              data={series}
              horizontal
              keyExtractor={(s) => s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.lg, paddingRight: spacing.lg, alignItems: 'flex-start' }}
              style={{ flexGrow: 0 }}
              renderItem={({ item }) => <SeriesCard series={item} size="md" />}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title={t('home.categories')} />
          {topCategory ? (
            <CategoryTile category={topCategory} variant="feature" count={topCategoryCount} />
          ) : null}
          {otherCategories.length > 0 ? (
            <View style={[styles.grid, topCategory && { marginTop: spacing.md }]}>
              {otherCategories.map((c) => (
                <View key={c.id} style={styles.gridItem}>
                  <CategoryTile category={c} />
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {topCategory && topCategoryVideos.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('home.fromCategory', { category: topCategoryName })}
              action={t('common.seeAll')}
              onActionPress={() => router.push(`/videos/${topCategory.slug}`)}
            />
            <FlatList
              data={topCategoryVideos}
              horizontal
              keyExtractor={(v) => v.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.lg, paddingRight: spacing.lg, alignItems: 'flex-start' }}
              style={{ flexGrow: 0 }}
              renderItem={({ item }) => <VideoCard video={item} size="md" />}
            />
          </View>
        ) : null}

        {continueVideos.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('home.continueWatching')}
              action={t('common.seeAll')}
              onActionPress={() => router.push('/videos')}
            />
            <FlatList
              data={continueVideos}
              horizontal
              keyExtractor={(v) => v.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.lg, paddingRight: spacing.lg, alignItems: 'flex-start' }}
              style={{ flexGrow: 0 }}
              renderItem={({ item }) => <VideoCard video={item} size="md" />}
            />
          </View>
        ) : null}

        {manuals.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('home.latestManuals')}
              action={t('common.seeAll')}
              onActionPress={() => router.push('/manuals')}
            />
            <FlatList
              data={manuals}
              horizontal
              keyExtractor={(m) => m.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.lg, paddingRight: spacing.lg, alignItems: 'flex-start' }}
              style={{ flexGrow: 0 }}
              renderItem={({ item }) => (
                <ManualCard manual={item} variant="cover" width={140} />
              )}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.lg, gap: spacing.xl },
  header: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  greeting: { color: colors.textMuted, ...typography.caption },
  name: { ...typography.h1, color: colors.text },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
  },
  noticeText: { color: colors.textMuted, ...typography.caption },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '48%', flexGrow: 1, height: 120 },
});
