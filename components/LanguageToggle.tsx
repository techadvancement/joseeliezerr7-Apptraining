import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/lib/haptics';
import { setLanguage } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/constants/theme';

const LANGS = [
  { code: 'en', short: 'EN', nameKey: 'common.english' },
  { code: 'es', short: 'ES', nameKey: 'common.spanish' },
] as const;

type Props = { style?: ViewStyle };

/**
 * Two-segment EN/ES switch.
 *
 * Lives on the sign-in screens so nobody has to guess their way through a
 * language they don't read in order to reach the setting inside the app.
 * The choice is written to storage by setLanguage(), so it survives reloads
 * and applies everywhere.
 */
export function LanguageToggle({ style }: Props) {
  const { t, i18n } = useTranslation();
  const current = i18n.language?.toLowerCase().startsWith('es') ? 'es' : 'en';

  async function pick(code: 'en' | 'es') {
    if (code === current) return;
    haptics.selection();
    await setLanguage(code);
  }

  return (
    <View
      style={[styles.group, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('common.language')}
    >
      {LANGS.map((lang) => {
        const selected = current === lang.code;
        return (
          <Pressable
            key={lang.code}
            onPress={() => pick(lang.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={t(lang.nameKey)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {lang.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  segment: {
    minWidth: 40,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: { backgroundColor: colors.surfaceAlt },
  segmentPressed: { opacity: 0.6 },
  label: {
    ...typography.caption,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  labelSelected: { color: colors.text },
});
