import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Video } from '@/lib/supabase';
import { formatDuration } from '@/lib/format';
import { thumb } from '@/lib/image';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';

type Props = {
  next: Video;
  seconds?: number;
  onPlayNow: () => void;
  onCancel: () => void;
};

export function UpNextOverlay({ next, seconds = 8, onPlayNow, onCancel }: Props) {
  const { t, i18n } = useTranslation();
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onPlayNow();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onPlayNow]);

  const title = i18n.language === 'es' ? next.title_es : next.title_en;
  const pct = Math.max(0, Math.min(100, ((seconds - remaining) / seconds) * 100));

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>
          {t('videos.upNext')} · {remaining}s
        </Text>
        <View style={styles.row}>
          <Image source={thumb(next.thumbnail_url, 200)} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={2} style={styles.title}>{title}</Text>
            <Text style={styles.meta}>{formatDuration(next.duration_seconds)}</Text>
          </View>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="close" size={16} color={colors.text} />
            <Text style={styles.btnText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            onPress={onPlayNow}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={[styles.btnText, { color: '#fff' }]}>{t('videos.playNow')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  eyebrow: {
    color: colors.primary,
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  thumb: {
    width: 96,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  title: { ...typography.bodyBold, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  bar: {
    height: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    borderRadius: radius.md,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnText: { ...typography.bodyBold, color: colors.text },
});
