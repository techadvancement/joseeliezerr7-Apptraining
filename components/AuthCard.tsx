import { Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthSplit } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  maxWidth?: number;
  gap?: number;
};

export function AuthCard({ children, maxWidth = 440, gap = spacing.xxl }: Props) {
  const split = useAuthSplit();

  if (split) {
    return (
      <View style={splitStyles.shell}>
        <BrandPanel />
        <View style={[splitStyles.formPanel, { gap }]}>{children}</View>
      </View>
    );
  }

  const asCard = Platform.OS === 'web';
  return (
    <View
      style={[
        styles.base,
        { maxWidth, gap },
        asCard ? styles.card : styles.flat,
      ]}
    >
      {children}
    </View>
  );
}

function BrandPanel() {
  const { t } = useTranslation();
  const bullets: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
    { icon: 'play-circle', key: 'auth.brandBullets.0' },
    { icon: 'library', key: 'auth.brandBullets.1' },
    { icon: 'cloud-download', key: 'auth.brandBullets.2' },
  ];
  return (
    <View style={splitStyles.brandPanel}>
      <View style={[splitStyles.blob, splitStyles.blobPrimary]} pointerEvents="none" />
      <View style={[splitStyles.blob, splitStyles.blobAccent]} pointerEvents="none" />

      <View style={splitStyles.brandTop}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={splitStyles.logo}
          contentFit="contain"
        />
        <Text style={splitStyles.brandName}>{t('common.appName')}</Text>
      </View>

      <View style={splitStyles.brandMid}>
        <Text style={splitStyles.tagline}>{t('auth.brandTagline')}</Text>
        <View style={splitStyles.bulletList}>
          {bullets.map((b) => (
            <View key={b.key} style={splitStyles.bulletRow}>
              <View style={splitStyles.bulletIcon}>
                <Ionicons name={b.icon} size={14} color={colors.primary} />
              </View>
              <Text style={splitStyles.bulletText}>{t(b.key)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={splitStyles.brandBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
  flat: {
    padding: spacing.xl,
  },
  card: {
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
  },
});

const splitStyles = StyleSheet.create({
  shell: {
    width: '100%',
    maxWidth: 920,
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    minHeight: 540,
  },
  brandPanel: {
    flex: 1,
    padding: spacing.xxl,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  formPanel: {
    flex: 1,
    padding: spacing.xxl,
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 9999,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : {}),
  },
  blobPrimary: {
    top: -60,
    left: -60,
    backgroundColor: colors.primary,
    opacity: 0.28,
  },
  blobAccent: {
    bottom: -80,
    right: -60,
    backgroundColor: colors.accent,
    opacity: 0.22,
  },
  brandTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  brandName: { ...typography.h3, color: colors.text, fontSize: 20 },
  brandMid: { gap: spacing.lg },
  tagline: {
    ...typography.h1,
    color: colors.text,
    fontSize: 30,
    lineHeight: 38,
  },
  bulletList: { gap: spacing.md },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bulletIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    color: colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  brandBottom: { height: 4 },
});
