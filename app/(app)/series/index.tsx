import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SeriesCard } from '@/components/SeriesCard';
import { EmptyState } from '@/components/EmptyState';
import { VideoCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { fetchSeries } from '@/lib/api';
import { useResponsive } from '@/lib/responsive';
import type { Series } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function SeriesIndex() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { columns } = useResponsive();
  const [series, setSeries] = useState<Series[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await fetchSeries();
      setSeries(s);
    } catch (err: any) {
      toast.error(err?.message ?? t('common.loadFailed'));
    }
  }, [toast, t]);

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
    if (!q) return series;
    return series.filter((s) => {
      const title = (lang === 'es' ? s.title_es : s.title_en).toLowerCase();
      return title.includes(q);
    });
  }, [series, query, i18n.language]);

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('series.title')}</Text>
              <Text style={styles.subtitle}>{t('series.subtitle')}</Text>
            </View>
          </View>
          <View style={styles.searchWrap}>
            <SearchBar value={query} onChange={setQuery} />
          </View>
        </View>

        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>{t('series.title')}</Text>
          {!loading && filtered.length > 0 ? (
            <Text style={styles.gridCount}>{filtered.length}</Text>
          ) : null}
        </View>

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
          <EmptyState icon="albums-outline" title={t('series.empty')} />
        ) : (
          <View style={styles.grid}>
            {Array.from({ length: Math.ceil(filtered.length / columns) }, (_, rowIdx) => {
              const slice = filtered.slice(rowIdx * columns, rowIdx * columns + columns);
              const fillers = columns - slice.length;
              return (
                <View key={rowIdx} style={styles.row}>
                  {slice.map((s) => (
                    <View key={s.id} style={styles.tile}>
                      <SeriesCard series={s} fullWidth />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  searchWrap: { marginTop: spacing.md },
  gridHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
