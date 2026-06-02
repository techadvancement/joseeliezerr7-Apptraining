import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing, typography } from '@/constants/theme';

export type Section = { heading: string; body: string };

type Props = {
  title: string;
  updatedAt: string;
  sections: Section[];
};

export function LegalDocument({ title, updatedAt, sections }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.updated}>{t('legal.updatedLabel', { date: updatedAt })}</Text>
        {sections.map((s, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.heading}>{s.heading}</Text>
            <Text style={styles.text}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
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
  body: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  updated: { color: colors.textMuted, ...typography.caption },
  section: { gap: spacing.sm },
  heading: { ...typography.h3, color: colors.text },
  text: { color: colors.text, lineHeight: 22 },
});
