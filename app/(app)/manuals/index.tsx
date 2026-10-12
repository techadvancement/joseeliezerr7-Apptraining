import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { CategoryChip } from '@/components/CategoryChip';
import { ManualCard } from '@/components/ManualCard';
import { SearchBar } from '@/components/SearchBar';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { ManualCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { fetchManual, fetchManuals } from '@/lib/api';
import { useResponsive } from '@/lib/responsive';
import { listBookmarks } from '@/lib/bookmarks';
import type { Manual } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/constants/theme';

type LangFilter = 'all' | 'en' | 'es';

export default function ManualsIndex() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { columns } = useResponsive();
  // La rejilla vive en una columna de 880 px, así que más de cuatro
  // columnas deja las portadas diminutas.
  const cols = Math.min(columns, 4);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [savedManuals, setSavedManuals] = useState<Manual[]>([]);
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
        if (user) {
          const bookmarks = await listBookmarks(user.id).catch(() => []);
          const manualBookmarks = bookmarks.filter((b) => b.type === 'manual');
          const hydrated: Manual[] = [];
          for (const b of manualBookmarks.slice(0, 8)) {
            const m = await fetchManual(b.id).catch(() => null);
            if (m) hydrated.push(m);
          }
          setSavedManuals(hydrated);
        }
      } catch (err: any) {
        toast.error(err?.message ?? t('common.loadFailed'));
      }
    },
    [toast, t, user]
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

  const isBrowsing = !query && filter === 'all';
  const showSaved = isBrowsing && savedManuals.length > 0;
  const gridHeading = query ? t('videos.searchResults') : t('manuals.allManuals');

  const stats = useMemo(() => {
    const enCount = manuals.filter((m) => m.pdf_url_en).length;
    const esCount = manuals.filter((m) => m.pdf_url_es).length;
    const totalPages = manuals.reduce((sum, m) => sum + (m.page_count ?? 0), 0);
    return { total: manuals.length, enCount, esCount, totalPages };
  }, [manuals]);

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
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

      {/* Saved manuals rail */}
      {showSaved ? (
        <View style={styles.savedSection}>
          <SectionHeader
            title={t('profile.bookmarks')}
            action={t('common.seeAll')}
            onActionPress={() => router.push('/profile/bookmarks')}
          />
          <FlatList
            data={savedManuals}
            horizontal
            keyExtractor={(m) => m.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.savedRail}
            renderItem={({ item }) => (
              <ManualCard manual={item} variant="cover" width={140} />
            )}
          />
        </View>
      ) : null}

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

      {/* Grid heading */}
      <View style={styles.gridHeader}>
        <Text style={styles.gridTitle}>{gridHeading}</Text>
        {!loading && filtered.length > 0 ? (
          <Text style={styles.gridCount}>{filtered.length}</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.list}>
          <ManualCardSkeleton />
          <ManualCardSkeleton />
          <ManualCardSkeleton />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.content}>
          <EmptyState
            icon="library-outline"
            title={t('manuals.empty')}
            description={query ? t('manuals.emptySearch') : undefined}
            tone="accent"
          />
        </View>
      ) : (
        <View style={styles.grid}>
          {Array.from({ length: Math.ceil(filtered.length / cols) }, (_, rowIdx) => {
            const slice = filtered.slice(rowIdx * cols, rowIdx * cols + cols);
            // Las celdas sobrantes se rellenan con huecos vacíos: sin ellas, dos
            // manuales se reparten toda la fila y acaban en esquinas opuestas.
            const fillers = cols - slice.length;
            return (
              <View key={rowIdx} style={styles.row}>
                {slice.map((m) => (
                  <View key={m.id} style={styles.gridItem}>
                    <ManualCard manual={m} variant="cover" fullWidth />
                  </View>
                ))}
                {Array.from({ length: fillers }).map((_, i) => (
                  <View key={`f-${i}`} style={styles.gridItem} />
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
  scroll: { paddingBottom: spacing.xxxl },
  // Todo el contenido de la página comparte la misma columna que la cabecera,
  // para que los chips, el título de la rejilla y las portadas queden alineados
  // en vez de pegados al borde de pantallas anchas.
  content: { width: '100%', maxWidth: 880, alignSelf: 'center' },
  header: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
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
  savedSection: {
    width: '100%', maxWidth: 880, alignSelf: 'center',
    paddingTop: spacing.xl, gap: spacing.sm, paddingHorizontal: spacing.lg,
  },
  savedRail: { paddingRight: spacing.lg, gap: spacing.md, alignItems: 'flex-start' },
  chips: {
    width: '100%', maxWidth: 880, alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  gridHeader: {
    width: '100%', maxWidth: 880, alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  gridTitle: { ...typography.h2, color: colors.text, fontSize: 18 },
  gridCount: { color: colors.textMuted, ...typography.caption, fontWeight: '700' },
  list: {
    width: '100%', maxWidth: 880, alignSelf: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md,
  },
  grid: {
    width: '100%', maxWidth: 880, alignSelf: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  gridItem: { flex: 1 },
});
