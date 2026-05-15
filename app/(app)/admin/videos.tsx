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
  createVideo,
  deleteVideo,
  listAllCategories,
  listAllSeries,
  listAllVideos,
  updateVideo,
} from '@/lib/admin';
import type { Series, Video, VideoCategory } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { formatDuration } from '@/lib/format';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; video: Video };

export default function AdminVideos() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Video[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });

  async function load() {
    setLoading(true);
    try {
      const [v, c, s] = await Promise.all([listAllVideos(), listAllCategories(), listAllSeries()]);
      setItems(v);
      setCategories(c);
      setSeries(s);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function confirmDelete(v: Video) {
    const doDelete = async () => {
      try {
        await deleteVideo(v.id);
        toast.success('Video eliminado');
        load();
      } catch (e: any) {
        toast.error(e?.message ?? 'Error');
      }
    };
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`¿Eliminar "${v.title_es}"?`)) doDelete();
    } else {
      Alert.alert('Eliminar', `¿Eliminar "${v.title_es}"?`, [
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
            <Text style={styles.eyebrow}>ADMIN · VIDEOS</Text>
            <Text style={styles.title}>
              {mode.kind === 'list'
                ? `${items.length} videos`
                : mode.kind === 'create'
                ? 'Nuevo video'
                : 'Editar video'}
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
              {items.map((v) => {
                const cat = categories.find((c) => c.id === v.category_id);
                return (
                  <View key={v.id} style={styles.row}>
                    {v.thumbnail_url ? (
                      <Image source={v.thumbnail_url} style={styles.rowThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.rowThumb, { backgroundColor: colors.surfaceAlt }]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={2} style={styles.rowTitle}>{v.title_es}</Text>
                      <Text style={styles.rowMeta}>
                        {cat?.name_es ?? '—'} · {formatDuration(v.duration_seconds)}
                      </Text>
                    </View>
                    <Pressable onPress={() => setMode({ kind: 'edit', video: v })} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={18} color={colors.text} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(v)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          <VideoForm
            initial={mode.kind === 'edit' ? mode.video : undefined}
            categories={categories}
            series={series}
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

function VideoForm({
  initial,
  categories,
  series,
  onSaved,
}: {
  initial?: Video;
  categories: VideoCategory[];
  series: Series[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categories[0]?.id ?? '');
  const [seriesId, setSeriesId] = useState<string | null>(initial?.series_id ?? null);
  const [seriesPosition, setSeriesPosition] = useState(String(initial?.series_position ?? ''));
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? '');
  const [titleEs, setTitleEs] = useState(initial?.title_es ?? '');
  const [descEn, setDescEn] = useState(initial?.description_en ?? '');
  const [descEs, setDescEs] = useState(initial?.description_es ?? '');
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail_url ?? '');
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? '');
  const [duration, setDuration] = useState(String(initial?.duration_seconds ?? 0));
  const [resolution, setResolution] = useState(initial?.resolution ?? '');
  const [sizeBytes, setSizeBytes] = useState<number | null>(initial?.size_bytes ?? null);
  const [instructor, setInstructor] = useState(initial?.instructor ?? 'Tech Advance');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!categoryId) { toast.error('Selecciona una categoría'); return; }
    if (!titleEn.trim() || !titleEs.trim()) { toast.error('Título obligatorio'); return; }
    if (!videoUrl) { toast.error('Sube el video'); return; }
    if (!thumbnail) { toast.error('Sube la miniatura'); return; }
    try {
      setSaving(true);
      const payload: any = {
        category_id: categoryId,
        title_en: titleEn.trim(),
        title_es: titleEs.trim(),
        description_en: descEn.trim() || null,
        description_es: descEs.trim() || null,
        thumbnail_url: thumbnail,
        video_url: videoUrl,
        duration_seconds: parseInt(duration || '0', 10),
        resolution: resolution || null,
        size_bytes: sizeBytes,
        instructor: instructor.trim() || null,
        series_id: seriesId,
        series_position: seriesId && seriesPosition ? parseInt(seriesPosition, 10) : null,
      };
      if (initial) {
        await updateVideo(initial.id, payload);
        toast.success('Video actualizado');
      } else {
        await createVideo(payload);
        toast.success('Video creado');
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
      <View>
        <Text style={styles.fieldLabel}>Categoría</Text>
        <View style={styles.chipsWrap}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.chip, categoryId === c.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                {c.name_es}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.fieldLabel}>Serie (opcional)</Text>
        <View style={styles.chipsWrap}>
          <Pressable
            onPress={() => { setSeriesId(null); setSeriesPosition(''); }}
            style={[styles.chip, seriesId === null && styles.chipActive]}
          >
            <Text style={[styles.chipText, seriesId === null && styles.chipTextActive]}>Sin serie</Text>
          </Pressable>
          {series.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setSeriesId(s.id)}
              style={[styles.chip, seriesId === s.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, seriesId === s.id && styles.chipTextActive]}>
                {s.title_es}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {seriesId ? (
        <AdminField
          label="Posición en la serie (1, 2, 3...)"
          value={seriesPosition}
          onChangeText={setSeriesPosition}
          keyboardType="number-pad"
          placeholder="1"
        />
      ) : null}

      <AdminField label="Título (Inglés)" value={titleEn} onChangeText={setTitleEn} placeholder="Getting Started" />
      <AdminField label="Título (Español)" value={titleEs} onChangeText={setTitleEs} placeholder="Primeros pasos" />
      <AdminField label="Descripción (Inglés)" value={descEn} onChangeText={setDescEn} multiline numberOfLines={3} placeholder="Optional" />
      <AdminField label="Descripción (Español)" value={descEs} onChangeText={setDescEs} multiline numberOfLines={3} placeholder="Opcional" />

      <View>
        <Text style={styles.fieldLabel}>Miniatura (1280×720, &lt;200 KB)</Text>
        <FilePicker
          bucket="thumbnails"
          accept="image/*"
          pathPrefix="videos"
          value={thumbnail}
          onUploaded={(url) => setThumbnail(url)}
        />
      </View>

      <View>
        <Text style={styles.fieldLabel}>Archivo de video (MP4 H.264, faststart)</Text>
        <FilePicker
          bucket="videos"
          accept="video/mp4,video/*"
          pathPrefix=""
          value={videoUrl}
          onUploaded={(url, file) => {
            setVideoUrl(url);
            setSizeBytes(file.size);
            // Try to extract duration
            if (typeof window !== 'undefined') {
              const v = document.createElement('video');
              v.preload = 'metadata';
              v.onloadedmetadata = () => {
                if (Number.isFinite(v.duration)) setDuration(String(Math.round(v.duration)));
                if (v.videoWidth && v.videoHeight) setResolution(`${v.videoWidth}x${v.videoHeight}`);
              };
              v.src = url;
            }
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AdminField label="Duración (seg)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <AdminField label="Resolución" value={resolution} onChangeText={setResolution} placeholder="1920x1080" />
        </View>
      </View>

      <AdminField label="Instructor" value={instructor} onChangeText={setInstructor} placeholder="Tech Advance" />

      <Button label={saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear video'} onPress={onSave} loading={saving} />
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
  rowThumb: { width: 84, height: 48, borderRadius: radius.sm },
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
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
});
