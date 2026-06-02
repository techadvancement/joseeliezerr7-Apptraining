import { useMemo } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { VideoCard } from '@/components/VideoCard';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useDownloads } from '@/lib/downloads';
import { formatBytes } from '@/lib/format';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function DownloadsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const downloads = useDownloads();

  const items = useMemo(() => downloads.list(), [downloads]);
  const total = useMemo(() => downloads.totalBytes(), [downloads]);

  async function confirmClearAll() {
    if (items.length === 0) return;
    const msg = t('profile.confirmClearAll');
    const run = async () => {
      try {
        await Promise.all(items.map((it) => downloads.remove(it.video.id)));
      } catch (e: any) {
        toast.error(e?.message ?? 'Error');
      }
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(msg)) await run();
    } else {
      Alert.alert(msg, undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.clearAll'), style: 'destructive', onPress: run },
      ]);
    }
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('profile.downloads')}</Text>
          {items.length > 0 ? (
            <Text style={styles.subtitle}>
              {t('profile.storageUsed', { size: formatBytes(total) })}
            </Text>
          ) : null}
        </View>
        {items.length > 0 ? (
          <Pressable
            onPress={confirmClearAll}
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.clearText}>{t('profile.clearAll')}</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.video.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <View style={styles.itemWrap}>
            <VideoCard video={item.video} size="lg" />
            <View style={styles.itemMeta}>
              <Ionicons name="cloud-done" size={12} color={colors.primary} />
              <Text style={styles.itemSize}>{formatBytes(item.sizeBytes)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="cloud-download-outline"
            title={t('profile.downloadsEmpty')}
            description={
              downloads.supported ? t('profile.downloadsEmptyDesc') : t('videos.downloadOnDeviceOnly')
            }
            tone="success"
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  clearText: { ...typography.caption, color: colors.danger, fontWeight: '700' },
  list: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  itemWrap: { gap: spacing.xs },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemSize: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
});
