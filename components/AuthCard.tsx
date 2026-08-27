import { Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useAuthSplit } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  maxWidth?: number;
  gap?: number;
};

/**
 * Shell shared by every sign-in screen.
 *
 * Wide web viewports get two panels: what the product is on the left, the form
 * on the right. Everything else gets a single centred card. Both carry the
 * brand mark and the language switch, so the switch is reachable before anyone
 * has signed in.
 */
export function AuthCard({ children, maxWidth = 440, gap = spacing.xxl }: Props) {
  const split = useAuthSplit();

  if (split) {
    return (
      <View style={splitStyles.shell}>
        <BrandPanel />
        <View style={splitStyles.formPanel}>
          <View style={splitStyles.formTopBar}>
            <LanguageToggle />
          </View>
          <View style={[splitStyles.formBody, { gap }]}>{children}</View>
        </View>
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
      <CompactHeader />
      {children}
    </View>
  );
}

/** Logo on the left, language switch on the right — phones and narrow web. */
function CompactHeader() {
  const { t } = useTranslation();
  return (
    <View style={styles.compactHeader}>
      <View style={styles.compactBrand}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.compactLogo}
          contentFit="contain"
        />
        <Text style={styles.compactName}>{t('common.appName')}</Text>
      </View>
      <LanguageToggle />
    </View>
  );
}

function BrandPanel() {
  const { t } = useTranslation();
  const features: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
    { icon: 'play-circle-outline', key: 'auth.brandBullets.0' },
    { icon: 'document-text-outline', key: 'auth.brandBullets.1' },
    { icon: 'cloud-download-outline', key: 'auth.brandBullets.2' },
  ];

  return (
    <View style={splitStyles.brandPanel}>
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
        <View style={splitStyles.featureList}>
          {features.map((f, i) => (
            <View
              key={f.key}
              style={[splitStyles.featureRow, i > 0 && splitStyles.featureDivider]}
            >
              <Ionicons name={f.icon} size={17} color={colors.primary} />
              <Text style={splitStyles.featureText}>{t(f.key)}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={splitStyles.brandFooter}>{t('auth.brandFooter')}</Text>
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
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  compactBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  compactLogo: { width: 36, height: 36, borderRadius: 10 },
  compactName: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.text,
    letterSpacing: -0.2,
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
    minHeight: 520,
  },
  brandPanel: {
    flex: 1,
    padding: spacing.xxl,
    backgroundColor: colors.bgElevated,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    justifyContent: 'space-between',
  },
  brandTop: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: { width: 40, height: 40, borderRadius: 11 },
  brandName: {
    ...typography.bodyBold,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.2,
  },
  brandMid: { gap: spacing.xl, paddingVertical: spacing.xl },
  tagline: {
    fontSize: 28,
    lineHeight: 37,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.text,
    maxWidth: 320,
  },
  featureList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  featureDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  featureText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  brandFooter: {
    ...typography.caption,
    color: colors.textSubtle,
    lineHeight: 17,
  },
  formPanel: {
    flex: 1,
    padding: spacing.xxl,
  },
  formTopBar: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  formBody: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing.lg,
  },
});
