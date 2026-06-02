import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer } from '@/lib/audioPlayer';
import { haptics } from '@/lib/haptics';
import { thumb } from '@/lib/image';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';

const TAB_BAR_HEIGHT = 56;

export function MiniPlayer() {
  const { track, isPlaying, position, duration, toggle, stop } = useAudioPlayer();
  const router = useRouter();
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  if (!track) return null;
  const title = i18n.language === 'es' ? track.title_es : track.title_en;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <View
      style={[styles.wrap, { bottom: TAB_BAR_HEIGHT + bottomPad + 6 }]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/videos/play/[id]',
              params: { id: track.id, from: pathname || '/' },
            })
          }
          style={({ pressed }) => [styles.body, pressed && { opacity: 0.85 }]}
        >
          <Image source={thumb(track.thumbnail_url, 96)} style={styles.thumb} contentFit="cover" />
          <View style={styles.info}>
            <Text numberOfLines={1} style={styles.title}>{title}</Text>
            {track.instructor ? (
              <Text numberOfLines={1} style={styles.sub}>{track.instructor}</Text>
            ) : null}
          </View>
        </Pressable>

        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? t('a11y.pause') : t('a11y.play')}
          onPress={() => {
            haptics.light();
            toggle();
          }}
          style={styles.playBtn}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" />
        </Pressable>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={() => {
            haptics.light();
            stop();
          }}
          style={styles.iconBtn}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.progressOverlay} pointerEvents="none">
          <View style={[styles.progressInner, { width: `${pct}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    overflow: 'hidden',
    ...shadow.card,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  info: { flex: 1, gap: 2 },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 13 },
  sub: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.border,
  },
  progressInner: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
