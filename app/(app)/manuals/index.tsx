import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { CategoryChip } from '@/components/CategoryChip';
import { ManualCard } from '@/components/ManualCard';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { ManualCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { fetchManuals } from '@/lib/api';
import type { Manual } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/constants/theme';

type LangFilter = 'all' | 'en' | 'es';

export default function ManualsIndex() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [filter, setFilter] = useState<LangFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (lang: LangFilter) => {
      try {
        const arg = lang === 'all' ? undefined : lang;
        const data = await fetchManuals(arg);
        setManuals(data);
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to load manuals');
      }
    },
    [toast]
  );

  useEffect(() => {
    setLoading(true);
    load(filter).finally(() => setLoading(false));
  }, [filter, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load(filter);
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    const lang = i18n.language as 'en' | 'es';
    const q = query.trim().toLowerCase();
    if (!q) return manuals;
    return manuals.filter((m) => {
      const title = (lang === 'es' ? m.title_es : m.title_en).toLowerCase();
      return title.includes(q);
    });
  }, [manuals, query, i18n.language]);

  const stats = useMemo(() => {
    const enCount = manuals.filter((m) => m.pdf_url_en).length;
    const esCount = manuals.filter((m) => m.pdf_url_es).length;
    const totalPages = manuals.reduce((sum, m) => sum + (m.page_count ?? 0), 0);
    return { total: manuals.length, enCount, esCount, totalPages };
  }, [manuals]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="library" size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t('manuals.title')}</Text>
        <Text style={styles.subtitle}>{t('manuals.subtitle')}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>{t('manuals.title')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalPages}</Text>
            <Text style={styles.statLabel}>{t('manuals.pages')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.max(stats.enCount > 0 ? 1 : 0, 0) + (stats.esCount > 0 ? 1 : 0)}</Text>
            <Text style={styles.statLabel}>{t('manuals.language')}</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <SearchBar value={query} onChange={setQuery} />
        </View>
      </View>

      <View style={styles.chips}>
        <CategoryChip
          label={t('manuals.all')}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <CategoryChip
          label="🇺🇸 EN"
          selected={filter === 'en'}
          onPress={() => setFilter('en')}
        />
        <CategoryChip
          label="🇪🇸 ES"
          selected={filter === 'es'}
          onPress={() => setFilter('es')}
        />
      </View>

      {loading ? (
        <View style={styles.list}>
          <ManualCardSkeleton />
          <ManualCardSkeleton />
          <ManualCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          }
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <ManualCard manual={item} variant="cover" />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="library-outline"
              title={t('manuals.empty')}
              description={query ? t('manuals.emptySearch') : undefined}
              tone="accent"
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.lg,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...typography.h2, color: colors.text, fontSize: 22 },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  searchWrap: { marginTop: spacing.md },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  row: { gap: spacing.md },
  gridItem: { flex: 1 },
});
