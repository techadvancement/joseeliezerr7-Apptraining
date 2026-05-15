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
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { AdminField } from '@/components/admin/AdminField';
import { FilePicker } from '@/components/admin/FilePicker';
import { useToast } from '@/components/Toast';
import {
  createCategory,
  deleteCategory,
  listAllCategories,
  slugify,
  updateCategory,
} from '@/lib/admin';
import type { VideoCategory } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; cat: VideoCategory };

export default function AdminCategories() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });

  async function load() {
    setLoading(true);
    try {
      const c = await listAllCategories();
      setItems(c);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function confirmDelete(c: VideoCategory) {
    const doDelete = async () => {
      try {
        await deleteCategory(c.id);
        toast.success('Categoría eliminada');
        load();
      } catch (e: any) {
        toast.error(e?.message ?? 'Error');
      }
    };
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`¿Eliminar "${c.name_es}"? Sus videos quedarán sin categoría.`)) doDelete();
    } else {
      Alert.alert('Eliminar', `¿Eliminar "${c.name_es}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable
            onPress={() => (mode.kind === 'list' ? router.back() : setMode({ kind: 'list' }))}
            hitSlop={12}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ADMIN · CATEGORÍAS</Text>
            <Text style={styles.title}>
              {mode.kind === 'list'
                ? `${items.length} categorías`
                : mode.kind === 'create'
                ? 'Nueva categoría'
                : `Editar: ${mode.cat.name_es}`}
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
              {items.map((c) => (
                <View key={c.id} style={styles.row}>
                  {c.thumbnail_url ? (
                    <Image source={c.thumbnail_url} style={styles.rowThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.rowThumb, { backgroundColor: colors.surfaceAlt }]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{c.name_es}</Text>
                    <Text style={styles.rowMeta}>
                      {c.slug} · orden {c.order_index}
                    </Text>
                  </View>
                  <Pressable onPress={() => setMode({ kind: 'edit', cat: c })} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={18} color={colors.text} />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(c)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          )
        ) : (
          <CategoryForm
            initial={mode.kind === 'edit' ? mode.cat : undefined}
            onSaved={() => {
              setMode({ kind: 'list' });
              load();
            }}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function CategoryForm({
  initial,
  onSaved,
}: {
  initial?: VideoCategory;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [nameEn, setNameEn] = useState(initial?.name_en ?? '');
  const [nameEs, setNameEs] = useState(initial?.name_es ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [order, setOrder] = useState(String(initial?.order_index ?? 1));
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail_url ?? null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!nameEn.trim() || !nameEs.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    const payload = {
      name_en: nameEn.trim(),
      name_es: nameEs.trim(),
      slug: (slug.trim() || slugify(nameEn)).toLowerCase(),
      order_index: parseInt(order || '1', 10),
      thumbnail_url: thumbnail,
    };
    try {
      setSaving(true);
      if (initial) {
        await updateCategory(initial.id, payload);
        toast.success('Categoría actualizada');
      } else {
        await createCategory(payload);
        toast.success('Categoría creada');
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <AdminField label="Nombre (Inglés)" value={nameEn} onChangeText={setNameEn} placeholder="BTT Writer" />
      <AdminField label="Nombre (Español)" value={nameEs} onChangeText={setNameEs} placeholder="BTT Writer" />
      <AdminField
        label="Slug (URL)"
        value={slug}
        onChangeText={setSlug}
        placeholder={slugify(nameEn) || 'btt-writer'}
        hint="Se autocompleta si lo dejas vacío"
        autoCapitalize="none"
      />
      <AdminField
        label="Orden"
        value={order}
        onChangeText={setOrder}
        keyboardType="number-pad"
        placeholder="1"
      />
      <View>
        <Text style={styles.fieldLabel}>Imagen de portada (1280×720 recomendado)</Text>
        <FilePicker
          bucket="thumbnails"
          accept="image/*"
          pathPrefix="categories"
          value={thumbnail}
          onUploaded={(url) => setThumbnail(url)}
        />
      </View>
      <Button label={saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear categoría'} onPress={onSave} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
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
  rowThumb: { width: 56, height: 56, borderRadius: radius.md },
  rowTitle: { ...typography.bodyBold, color: colors.text, fontSize: 15 },
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
