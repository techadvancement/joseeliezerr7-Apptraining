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
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { useResponsive } from '@/lib/responsive';
import { SectionHeader } from '@/components/SectionHeader';
import { VideoCard } from '@/components/VideoCard';
import { ManualCard } from '@/components/ManualCard';
import { CategoryTile } from '@/components/CategoryTile';
import { SeriesCard } from '@/components/SeriesCard';
import { FeaturedHero } from '@/components/FeaturedHero';
import { AccountMenu } from '@/components/AccountMenu';
import {
  CategoryTileSkeleton,
  HeroSkeleton,
  RailSkeleton,
  SectionHeaderSkeleton,
} from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import {
  fetchCategories,
  fetchManuals,
  fetchSeries,
  fetchVideoCategoryIds,
  fetchVideos,
  USING_MOCKS,
} from '@/lib/api';
import { listContinueWatching, type Progress } from '@/lib/progress';
import { thumb } from '@/lib/image';
import { ResumeBanner } from '@/components/ResumeBanner';
import type { Manual, Series, Video, VideoCategory } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { columns, isPhone } = useResponsive();
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [continueItems, setContinueItems] = useState<{ video: Video; progress: Progress }[]>([]);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Map<string, number>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const avatarInitial = (profile?.full_name ?? user?.email ?? '?')[0]?.toUpperCase() ?? '?';

  async function load() {
    const [c, v, m, s, vCatIds] = await Promise.all([
      fetchCategories(),
      fetchVideos(undefined, { limit: 30 }),
      fetchManuals(undefined, { limit: 8 }),
      fetchSeries({ limit: 12 }),
      fetchVideoCategoryIds().catch(() => [] as { category_id: string }[]),
    ]);
    setCategories(c);
    setVideos(v);
    setManuals(m);
    setSeries(s);

    const counts = new Map<string, number>();
    for (const row of vCatIds) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
    setCategoryCounts(counts);

    if (user) {
      const progress = await listContinueWatching(user.id, 8).catch(() => []);
      const byId = new Map(v.map((x) => [x.id, x] as const));
      const items: { video: Video; progress: Progress }[] = [];
      for (const p of progress) {
        const vid = byId.get(p.video_id);
        if (vid) items.push({ video: vid, progress: p });
      }
      setContinueItems(items);
    }
  }

  useEffect(() => {
    load()
      .catch(() => toast.error(t('common.loadFailed')))
      .finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(() => toast.error(t('common.loadFailed')));
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
    let topId: string | null = null;
    let max = 0;
    for (const [cid, cnt] of categoryCounts.entries()) {
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
      topCategoryCount: topId ? categoryCounts.get(topId) ?? 0 : 0,
      otherCategories: rest,
    };
  }, [categories, videos, categoryCounts]);

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
        <View style={styles.headerGroup}>
        {isPhone ? (
          <View style={styles.brandRow}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.brandLogo}
              contentFit="contain"
            />
            <Text style={styles.brandName} numberOfLines={1}>
              {t('common.appName')}
            </Text>
          </View>
        ) : null}

        <View style={styles.header}>
          {isPhone ? (
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => [styles.avatarBtn, pressed && { opacity: 0.75 }]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.account')}
            >
              {profile?.avatar_url ? (
                <Image source={thumb(profile.avatar_url, 80)} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Text style={styles.avatarInitial}>{avatarInitial}</Text>
              )}
              <View style={styles.avatarCaret}>
                <Ionicons name="chevron-down" size={10} color={colors.text} />
              </View>
            </Pressable>
          ) : null}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.greeting}>{t('home.title')}</Text>
            <Text style={styles.name} numberOfLines={1}>{profile?.full_name ?? ''}</Text>
          </View>
          {isPhone ? (
            <Pressable
              onPress={() => router.push('/search')}
              style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="search" size={22} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
        </View>

        {USING_MOCKS ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Demo data — set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to connect Supabase.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <>
            <View style={{ paddingHorizontal: spacing.lg }}>
              <HeroSkeleton />
            </View>
            <View style={styles.section}>
              <SectionHeaderSkeleton />
              <RailSkeleton cardWidth={240} count={4} />
            </View>
            <View style={styles.section}>
              <SectionHeaderSkeleton />
              <RailSkeleton cardWidth={240} count={4} />
            </View>
            <View style={styles.section}>
              <SectionHeaderSkeleton />
              <View style={styles.grid}>
                {Array.from({ length: columns * 2 }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.gridItem, { width: `${100 / columns - 2}%` }]}
                  >
                    <CategoryTileSkeleton />
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {!loading && featured ? (
          <View style={styles.heroWrap}>
            <FeaturedHero video={featured} />
          </View>
        ) : null}

        {continueItems.length > 0 ? (
          <View style={styles.resumeWrap}>
            <ResumeBanner
              video={continueItems[0].video}
              progress={continueItems[0].progress}
            />
          </View>
        ) : null}

        {continueItems.length > 1 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('home.continueWatching')}
              action={t('common.seeAll')}
              onActionPress={() => router.push('/profile/library')}
            />
            <FlatList
              data={continueItems.slice(1).map((it) => it.video)}
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

        {categories.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('home.categories')} />
            <View style={styles.grid}>
              {categories.map((c) => (
                <View
                  key={c.id}
                  style={[styles.gridItem, { width: `${100 / columns - 2}%` }]}
                >
                  <CategoryTile category={c} />
                </View>
              ))}
              {/* Filler tiles so the last row keeps the same column width
                  instead of the trailing item stretching to 100%. */}
              {categories.length % columns !== 0
                ? Array.from({ length: columns - (categories.length % columns) }).map(
                    (_, i) => (
                      <View
                        key={`filler-${i}`}
                        style={[
                          styles.gridItem,
                          styles.gridFiller,
                          { width: `${100 / columns - 2}%` },
                        ]}
                      />
                    )
                  )
                : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <AccountMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.lg, gap: spacing.xl },
  headerGroup: { gap: spacing.sm },
  brandRow: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandLogo: { width: 36, height: 36, borderRadius: 10 },
  brandName: { ...typography.h3, color: colors.text, fontSize: 18 },
  header: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
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
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary + '66',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarInitial: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 16,
  },
  avatarCaret: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
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
  resumeWrap: { paddingHorizontal: spacing.lg },
  heroWrap: { paddingHorizontal: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { height: 120 },
  gridFiller: { opacity: 0 },
});
