import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { Button } from '@/components/ui/Button';
import { AdminField } from '@/components/admin/AdminField';
import { FilePicker } from '@/components/admin/FilePicker';
import { useToast } from '@/components/Toast';
import {
  createManual,
  deleteManual,
  listAllManuals,
  updateManual,
} from '@/lib/admin';
import type { Manual } from '@/lib/supabase';
import { thumb } from '@/lib/image';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; manual: Manual };

export default function AdminManuals() {
  const router = useRouter();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const manualTitle = (m: Manual) => (lang === 'es' ? m.title_es : m.title_en);
  const [items, setItems] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });

  async function load() {
    setLoading(true);
    try {
      const m = await listAllManuals();
      setItems(m);
    } catch (e: any) {
      toast.error(e?.message ?? t('admin.errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function confirmDelete(m: Manual) {
    const doDelete = async () => {
      try {
        await deleteManual(m.id);
        toast.success(t('admin.toasts.deletedManual'));
        load();
      } catch (e: any) {
        toast.error(e?.message ?? t('admin.errors.generic'));
      }
    };
    const msg = t('admin.confirms.deleteManual', { name: manualTitle(m) });
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
              <Text style={styles.eyebrow}>{t('admin.labels.manuals')}</Text>
              <Text style={styles.title}>
                {mode.kind === 'list'
                  ? t('admin.titles.manualsCount', { count: items.length })
                  : mode.kind === 'create'
                  ? t('admin.new.manual')
                  : t('admin.edit.manual')}
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
                {items.map((m) => (
                  <View key={m.id} style={styles.row}>
                    {m.thumbnail_url ? (
                      <Image source={thumb(m.thumbnail_url, 128)} style={styles.rowThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.rowThumb, { backgroundColor: colors.surfaceAlt }]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={2} style={styles.rowTitle}>{manualTitle(m)}</Text>
                      <Text style={styles.rowMeta}>
                        {[m.pdf_url_en ? 'EN' : null, m.pdf_url_es ? 'ES' : null].filter(Boolean).join(' · ')}
                        {m.page_count ? ` · ${t('admin.rowPages', { count: m.page_count })}` : ''}
                      </Text>
                    </View>
                    <Pressable onPress={() => setMode({ kind: 'edit', manual: m })} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={18} color={colors.text} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(m)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )
          ) : (
            <ManualForm
              initial={mode.kind === 'edit' ? mode.manual : undefined}
              onSaved={() => {
                setMode({ kind: 'list' });
                load();
              }}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ManualForm({
  initial,
  onSaved,
}: {
  initial?: Manual;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { t } = useTranslation();
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? '');
  const [titleEs, setTitleEs] = useState(initial?.title_es ?? '');
  const [descEn, setDescEn] = useState(initial?.description_en ?? '');
  const [descEs, setDescEs] = useState(initial?.description_es ?? '');
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail_url ?? '');
  const [pdfEn, setPdfEn] = useState(initial?.pdf_url_en ?? '');
  const [pdfEs, setPdfEs] = useState(initial?.pdf_url_es ?? '');
  const [pages, setPages] = useState(String(initial?.page_count ?? ''));
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!titleEn.trim() || !titleEs.trim()) { toast.error(t('admin.errors.titleRequired')); return; }
    if (!thumbnail) { toast.error(t('admin.errors.thumbnailRequired')); return; }
    if (!pdfEn && !pdfEs) { toast.error(t('admin.errors.pdfRequired')); return; }
    try {
      setSaving(true);
      const payload = {
        title_en: titleEn.trim(),
        title_es: titleEs.trim(),
        description_en: descEn.trim() || null,
        description_es: descEs.trim() || null,
        thumbnail_url: thumbnail,
        pdf_url_en: pdfEn || null,
        pdf_url_es: pdfEs || null,
        page_count: pages ? parseInt(pages, 10) : null,
      };
      if (initial) {
        await updateManual(initial.id, payload);
        toast.success(t('admin.toasts.savedManual'));
      } else {
        await createManual(payload);
        toast.success(t('admin.toasts.createdManual'));
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
      <AdminField label={t('admin.form.titleEn')} value={titleEn} onChangeText={setTitleEn} placeholder="User Guide" />
      <AdminField label={t('admin.form.titleEs')} value={titleEs} onChangeText={setTitleEs} placeholder="Guía del usuario" />
      <AdminField label={t('admin.form.descriptionEn')} value={descEn} onChangeText={setDescEn} multiline numberOfLines={3} />
      <AdminField label={t('admin.form.descriptionEs')} value={descEs} onChangeText={setDescEs} multiline numberOfLines={3} />

      <View>
        <Text style={styles.fieldLabel}>{t('admin.form.thumbnailManual')}</Text>
        <FilePicker
          bucket="thumbnails"
          accept="image/*"
          pathPrefix="manuals"
          value={thumbnail}
          onUploaded={(url) => setThumbnail(url)}
        />
      </View>

      <View>
        <Text style={styles.fieldLabel}>{t('admin.form.pdfEn')}</Text>
        <FilePicker
          bucket="manuals"
          accept="application/pdf"
          pathPrefix="en"
          value={pdfEn}
          onUploaded={(url) => setPdfEn(url)}
        />
      </View>

      <View>
        <Text style={styles.fieldLabel}>{t('admin.form.pdfEs')}</Text>
        <FilePicker
          bucket="manuals"
          accept="application/pdf"
          pathPrefix="es"
          value={pdfEs}
          onUploaded={(url) => setPdfEs(url)}
        />
      </View>

      <AdminField label={t('admin.form.pages')} value={pages} onChangeText={setPages} keyboardType="number-pad" placeholder="48" />

      <Button
        label={
          saving
            ? t('admin.buttons.saving')
            : initial
            ? t('admin.buttons.save')
            : t('admin.buttons.createManual')
        }
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
  rowThumb: { width: 50, height: 68, borderRadius: radius.sm },
  rowTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
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
});
