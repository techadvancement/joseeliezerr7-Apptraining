import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/components/Toast';
import { uploadToBucket, slugify } from '@/lib/admin';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Props = {
  bucket: 'videos' | 'manuals' | 'thumbnails' | 'avatars';
  /** Accept attribute for the <input>: 'image/*', 'video/*', 'application/pdf' */
  accept: string;
  /** Folder prefix inside bucket */
  pathPrefix?: string;
  /** Current URL value (if any) — used to show "already uploaded" state */
  value?: string | null;
  /** When upload finishes, return the public URL */
  onUploaded: (url: string, file: File) => void;
  /** Optional label shown on the button */
  label?: string;
};

export function FilePicker({ bucket, accept, pathPrefix = '', value, onUploaded, label }: Props) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleFile(file: File) {
    try {
      setUploading(true);
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'file';
      const filename = `${base}-${Date.now()}.${ext}`;
      const path = pathPrefix ? `${pathPrefix.replace(/^\/|\/$/g, '')}/${filename}` : filename;
      setProgress(`Subiendo ${(file.size / (1024 * 1024)).toFixed(1)} MB...`);
      const url = await uploadToBucket(bucket, path, file);
      onUploaded(url, file);
      toast.success('Archivo subido');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al subir');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  function pickWeb() {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) handleFile(f);
    };
    input.click();
  }

  const hasFile = !!value;
  const labelText = label ?? (hasFile ? 'Reemplazar archivo' : 'Seleccionar archivo');

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={pickWeb}
        disabled={uploading}
        style={({ pressed }) => [
          styles.btn,
          hasFile && styles.btnFilled,
          pressed && { opacity: 0.85 },
        ]}
      >
        {uploading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Ionicons
            name={hasFile ? 'checkmark-circle' : 'cloud-upload-outline'}
            size={20}
            color={hasFile ? '#10B981' : colors.primary}
          />
        )}
        <Text style={styles.btnText}>{progress ?? labelText}</Text>
      </Pressable>
      {hasFile ? (
        <Text style={styles.hint} numberOfLines={1}>
          {value!.split('/').slice(-1)[0]}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  btnFilled: { borderColor: '#10B98155', backgroundColor: '#10B98111', borderStyle: 'solid' },
  btnText: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  hint: { ...typography.caption, color: colors.textMuted, paddingHorizontal: spacing.sm },
});
