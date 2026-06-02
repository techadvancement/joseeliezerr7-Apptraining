import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { AdminField } from '@/components/admin/AdminField';
import { FilePicker } from '@/components/admin/FilePicker';
import { useToast } from '@/components/Toast';
import {
  createSeries,
  deleteSeries,
  listAllCategories,
  listAllSeries,
  slugify,
  updateSeries,
} from '@/lib/admin';
import type { Series, VideoCategory } from '@/lib/supabase';
import { thumb } from '@/lib/image';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; series: Series };

export default function AdminSeries() {
  const router = useRouter();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const seriesName = (s: Series) => (lang === 'es' ? s.title_es : s.title_en);
  const categoryName = (c: VideoCategory) => (lang === 'es' ? c.name_es : c.name_en);
  const [items, setItems] = useState<Series[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });

  async function load() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([listAllSeries(), listAllCategories()]);
      setItems(s);
      setCategories(c);
    } catch (e: any) {
      toast.error(e?.message ?? t('admin.errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function confirmDelete(s: Series) {
    const doDelete = async () => {
      try {
        await deleteSeries(s.id);
        toast.success(t('admin.toasts.deletedSeries'));
        load();
      } catch (e: any) { toast.error(e?.message ?? t('admin.errors.generic')); }
    };
    const msg = t('admin.confirms.deleteSeries', { name: seriesName(s) });
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(msg)) doDelete();
    } else {
      Alert.alert(t('admin.confirms.delete'), msg, [
        { text: t('admin.confirms.cancel'), style: 'cancel' },
        { text: t('admin.confirms.delete'), style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  const innerStyle = mode.kind === 'list' ? styles.innerList : styles.innerForm;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={innerStyle}>
          <View style={styles.header}>
            <Pressable
              onPress={() => (mode.kind === 'list' ? router.back() : setMode({ kind: 'list' }))}
              hitSlop={12}
              style={styles.back}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{t('admin.labels.series')}</Text>
              <Text style={styles.title}>
                {mode.kind === 'list'
                  ? t('admin.titles.seriesCount', { count: items.length })
                  : mode.kind === 'create'
                  ? t('admin.new.series')
                  : t('admin.edit.series', { name: seriesName(mode.series) })}
              </Text>
            </View>
            {mode.kind === 'list' ? (
              <Pressable
                onPress={() => setMode({ kind: 'create' })}
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            ) : null}
          </View>

          {mode.kind === 'list' ? (
            loading ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: spacing.xxl }} />
            ) : (
              <View style={{ gap: spacing.sm }}>
                {items.map((s) => (
                  <View key={s.id} style={styles.row}>
                    {s.thumbnail_url ? (
                      <Image source={thumb(s.thumbnail_url, 192)} style={styles.rowThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.rowThumb, { backgroundColor: colors.surfaceAlt }]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text numberOfLines={1} style={styles.rowTitle}>{seriesName(s)}</Text>
                        {s.featured ? (
                          <Ionicons name="star" size={12} color={colors.accent} />
                        ) : null}
                      </View>
                      <Text style={styles.rowMeta}>
                        {s.slug} · {t('admin.rowOrder', { n: s.order_index })}
                      </Text>
                    </View>
                    <Pressable onPress={() => setMode({ kind: 'edit', series: s })} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={18} color={colors.text} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(s)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
                {items.length === 0 ? (
                  <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
                    {t('admin.series.empty')}
                  </Text>
                ) : null}
              </View>
            )
          ) : (
            <SeriesForm
              initial={mode.kind === 'edit' ? mode.series : undefined}
              categories={categories}
              onSaved={() => { setMode({ kind: 'list' }); load(); }}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SeriesForm({
  initial,
  categories,
  onSaved,
}: {
  initial?: Series;
  categories: VideoCategory[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const categoryName = (c: VideoCategory) => (lang === 'es' ? c.name_es : c.name_en);
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? '');
  const [titleEs, setTitleEs] = useState(initial?.title_es ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [descEn, setDescEn] = useState(initial?.description_en ?? '');
  const [descEs, setDescEs] = useState(initial?.description_es ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? null);
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail_url ?? null);
  const [order, setOrder] = useState(String(initial?.order_index ?? 1));
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!titleEn.trim() || !titleEs.trim()) { toast.error(t('admin.errors.titleRequired')); return; }
    try {
      setSaving(true);
      const payload = {
        title_en: titleEn.trim(),
        title_es: titleEs.trim(),
        slug: (slug.trim() || slugify(titleEn)).toLowerCase(),
        description_en: descEn.trim() || null,
        description_es: descEs.trim() || null,
        category_id: categoryId,
        thumbnail_url: thumbnail,
        order_index: parseInt(order || '1', 10),
        featured,
      };
      if (initial) {
        await updateSeries(initial.id, payload);
        toast.success(t('admin.toasts.savedSeries'));
      } else {
        await createSeries(payload);
        toast.success(t('admin.toasts.createdSeries'));
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? t('admin.errors.save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <AdminField label={t('admin.form.titleEn')} value={titleEn} onChangeText={setTitleEn} placeholder={t('admin.series.placeholderTitleEn')} />
      <AdminField label={t('admin.form.titleEs')} value={titleEs} onChangeText={setTitleEs} placeholder={t('admin.series.placeholderTitleEs')} />
      <AdminField
        label={t('admin.form.slug')}
        value={slug}
        onChangeText={setSlug}
        placeholder={slugify(titleEn) || 'btt-writer-complete-course'}
        autoCapitalize="none"
      />
      <AdminField label={t('admin.form.descriptionEn')} value={descEn} onChangeText={setDescEn} multiline numberOfLines={3} />
      <AdminField label={t('admin.form.descriptionEs')} value={descEs} onChangeText={setDescEs} multiline numberOfLines={3} />

      <View>
        <Text style={styles.fieldLabel}>{t('admin.form.categoryOptional')}</Text>
        <View style={styles.chipsWrap}>
          <Pressable
            onPress={() => setCategoryId(null)}
            style={[styles.chip, categoryId === null && styles.chipActive]}
          >
            <Text style={[styles.chipText, categoryId === null && styles.chipTextActive]}>{t('admin.form.noCategory')}</Text>
          </Pressable>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.chip, categoryId === c.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{categoryName(c)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.fieldLabel}>{t('admin.form.thumbnailSeries')}</Text>
        <FilePicker
          bucket="thumbnails"
          accept="image/*"
          pathPrefix="series"
          value={thumbnail}
          onUploaded={(url) => setThumbnail(url)}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AdminField label={t('admin.form.order')} value={order} onChangeText={setOrder} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={styles.featuredRow}>
            <View>
              <Text style={styles.fieldLabel}>{t('admin.form.featured')}</Text>
              <Text style={styles.featuredHint}>{t('admin.form.featuredHint')}</Text>
            </View>
            <Switch
              value={featured}
              onValueChange={setFeatured}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
            />
          </View>
        </View>
      </View>

      <Button
        label={saving ? t('admin.buttons.saving') : initial ? t('admin.buttons.save') : t('admin.buttons.createSeries')}
        onPress={onSave}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, alignItems: 'center' },
  innerList: { width: '100%', maxWidth: 1100, gap: spacing.lg },
  innerForm: { width: '100%', maxWidth: 880, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  eyebrow: { color: colors.primary, fontWeight: '800', letterSpacing: 1.2, fontSize: 11 },
  title: { ...typography.h2, color: colors.text, fontSize: 20 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  rowThumb: { width: 84, height: 48, borderRadius: radius.sm },
  rowTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14, flexShrink: 1 },
  rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldLabel: {
    ...typography.caption, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 11, fontWeight: '700',
    marginBottom: 4,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  featuredHint: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
});
