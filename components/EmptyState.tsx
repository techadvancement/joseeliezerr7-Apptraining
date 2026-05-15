import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Tone = 'default' | 'accent' | 'success' | 'muted';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  tone?: Tone;
};

const TONES: Record<Tone, { primary: string; secondary: string; icon: string }> = {
  default: { primary: colors.primary, secondary: '#7C5BFA', icon: colors.primary },
  accent: { primary: colors.accent, secondary: '#FB923C', icon: colors.accent },
  success: { primary: colors.success, secondary: '#10B981', icon: colors.success },
  muted: { primary: colors.textMuted, secondary: colors.textSubtle, icon: colors.textMuted },
};

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function EmptyState({ icon = 'sparkles-outline', title, description, tone = 'default' }: Props) {
  const t = TONES[tone];
  return (
    <View style={styles.wrap}>
      <View style={styles.illustration}>
        <View
          style={[
            styles.blobLg,
            { backgroundColor: hexToRgba(t.primary, 0.18), borderColor: hexToRgba(t.primary, 0.25) },
          ]}
        />
        <View
          style={[
            styles.blobMd,
            { backgroundColor: hexToRgba(t.secondary, 0.22), borderColor: hexToRgba(t.secondary, 0.3) },
          ]}
        />
        <View style={[styles.dot, styles.dotA, { backgroundColor: hexToRgba(t.primary, 0.55) }]} />
        <View style={[styles.dot, styles.dotB, { backgroundColor: hexToRgba(t.secondary, 0.55) }]} />
        <View style={[styles.dot, styles.dotC, { backgroundColor: hexToRgba(t.primary, 0.35) }]} />
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.bgElevated,
              borderColor: hexToRgba(t.primary, 0.35),
              shadowColor: t.primary,
            },
          ]}
        >
          <Ionicons name={icon} size={36} color={t.icon} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
    </View>
  );
}

const ILLUSTRATION_SIZE = 160;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  illustration: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  blobLg: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: radius.pill,
    borderWidth: 1,
    top: 8,
    left: 6,
  },
  blobMd: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 10,
    right: 8,
  },
  dot: {
    position: 'absolute',
    borderRadius: radius.pill,
  },
  dotA: {
    width: 8,
    height: 8,
    top: 18,
    right: 22,
  },
  dotB: {
    width: 6,
    height: 6,
    bottom: 24,
    left: 18,
  },
  dotC: {
    width: 5,
    height: 5,
    top: 70,
    right: 8,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: { ...typography.h3, color: colors.text, textAlign: 'center' },
  desc: { color: colors.textMuted, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
});
