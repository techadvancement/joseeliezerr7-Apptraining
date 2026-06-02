import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDownloads } from '@/lib/downloads';
import { useToast } from '@/components/Toast';
import { haptics } from '@/lib/haptics';
import { colors, radius, typography } from '@/constants/theme';
import type { Video } from '@/lib/supabase';

function confirmDialog(
  message: string,
  cancelLabel: string,
  confirmLabel: string,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(message, undefined, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function DownloadButton({
  video,
  iconSize = 20,
}: {
  video: Video;
  iconSize?: number;
}) {
  const downloads = useDownloads();
  const toast = useToast();
  const { t } = useTranslation();
  const status = downloads.status(video.id);

  const onPress = useCallback(async () => {
    haptics.light();
    if (!downloads.supported) {
      toast.show(t('videos.downloadOnDeviceOnly'), 'info');
      return;
    }
    if (status.state === 'downloading') return;
    if (status.state === 'done') {
      const ok = await confirmDialog(
        t('videos.confirmRemoveDownload'),
        t('common.cancel'),
        t('videos.removeDownload'),
      );
      if (ok) await downloads.remove(video.id).catch(() => {});
      return;
    }
    try {
      await downloads.download(video);
      haptics.success();
    } catch (e: any) {
      toast.error(e?.message ?? t('videos.downloadFailed'));
      haptics.error();
    }
  }, [downloads, status.state, t, toast, video]);

  if (status.state === 'downloading') {
    const pct = Math.round(status.progress * 100);
    return (
      <View style={styles.btn}>
        {pct > 0 ? (
          <Text style={styles.pctText}>{pct}%</Text>
        ) : (
          <ActivityIndicator color={colors.primary} size="small" />
        )}
      </View>
    );
  }

  const done = status.state === 'done';
  const iconName = done ? 'cloud-done' : 'cloud-download-outline';
  const iconColor = done
    ? colors.primary
    : downloads.supported
    ? colors.text
    : colors.textSubtle;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={done ? t('videos.removeDownload') : t('videos.download')}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    fontSize: 11,
  },
});
