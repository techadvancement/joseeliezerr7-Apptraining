import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/SearchBar';
import { VideoCard } from '@/components/VideoCard';
import { ManualCard } from '@/components/ManualCard';
import { EmptyState } from '@/components/EmptyState';
import { ManualCardSkeleton, VideoCardSkeleton } from '@/components/Skeleton';
import { fetchCategories, fetchManuals, fetchVideos } from '@/lib/api';
import { useResponsive } from '@/lib/responsive';
import type { Manual, Video, VideoCategory } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Row =
  | { kind: 'video'; data: Video }
  | { kind: 'manual'; data: Manual };

type TypeFilter = 'all' | 'videos' | 'manuals';

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'es';
  const { isPhone } = useResponsive();
  const listCols = isPhone ? 1 : 2;
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchVideos(), fetchManuals(), fetchCategories()])
      .then(([v, m, c]) => {
        setVideos(v);
        setManuals(m);
        setCategories(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasFilter = query.trim().length > 0 || typeFilter !== 'all' || categoryId !== null;

  const results = useMemo<Row[]>(() => {
    if (!hasFilter) return [];
    const q = query.trim().toLowerCase();
    const matchText = (en: string, es: string) =>
      !q || (lang === 'es' ? es : en).toLowerCase().includes(q);

    const v: Row[] =
      typeFilter === 'manuals'
        ? []
        : videos
            .filter((x) => matchText(x.title_en, x.title_es))
            .filter((x) => !categoryId || x.category_id === categoryId)
            .map((data) => ({ kind: 'video', data }));

    const m: Row[] =
      typeFilter === 'videos' || categoryId !== null
        ? []
        : manuals
            .filter((x) => matchText(x.title_en, x.title_es))
            .map((data) => ({ kind: 'manual', data }));

    return [...v, ...m];
  }, [hasFilter, query, videos, manuals, lang, typeFilter, categoryId]);

  const typeOptions: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: t('search.filters.all') },
    { id: 'videos', label: t('search.filters.videos') },
    { id: 'manuals', label: t('search.filters.manuals') },
  ];

  const showCategories = typeFilter !== 'manuals' && categories.length > 0;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('search.title')}</Text>
        <Text style={styles.subtitle}>{t('search.subtitle')}</Text>
        <View style={styles.searchWrap}>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={t('search.placeholder')}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {typeOptions.map((opt) => {
            const active = typeFilter === opt.id;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                active={active}
                onPress={() => {
                  setTypeFilter(opt.id);
                  if (opt.id === 'manuals') setCategoryId(null);
                }}
              />
            );
          })}
        </ScrollView>

        {showCategories ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <Chip
              label={t('search.filters.allCategories')}
              active={categoryId === null}
              onPress={() => setCategoryId(null)}
            />
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={lang === 'es' ? c.name_es : c.name_en}
                active={categoryId === c.id}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.list}>
          <VideoCardSkeleton width={320} />
          <ManualCardSkeleton />
          <VideoCardSkeleton width={320} />
        </View>
      ) : (
        <FlatList
          key={`cols-${listCols}`}
          data={results}
          keyExtractor={(it) => `${it.kind}-${it.data.id}`}
          numColumns={listCols}
          columnWrapperStyle={listCols > 1 ? { gap: spacing.md } : undefined}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <View style={listCols > 1 ? { flex: 1 } : undefined}>
              {item.kind === 'video' ? (
                <VideoCard video={item.data} size="lg" fullWidth={listCols > 1} />
              ) : (
                <ManualCard manual={item.data} />
              )}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title={hasFilter ? t('search.emptyTitle') : t('search.startTitle')}
              description={hasFilter ? t('search.emptyDesc') : t('search.startDesc')}
            />
          }
        />
      )}
    </Screen>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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
  chipsRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextActive: { color: '#fff' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
});
