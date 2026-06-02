import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';
import { useState } from 'react';

export default function CheckEmailScreen() {
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  async function resend() {
    if (!SUPABASE_CONFIGURED || !email) {
      setSent(true);
      return;
    }
    try {
      setResending(true);
      await supabase.auth.resend({ type: 'signup', email: String(email) });
      setSent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-open" size={48} color="#fff" />
        </View>
        <Text style={styles.title}>{t('auth.checkEmailTitle')}</Text>
        <Text style={styles.text}>
          {t('auth.checkEmailBody', { email: String(email ?? '') })}
        </Text>

        <View style={styles.actions}>
          <Button
            label={sent ? t('auth.checkEmailResent') : t('auth.checkEmailResend')}
            variant="secondary"
            onPress={resend}
            loading={resending}
            disabled={sent}
            fullWidth
          />
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.linkRow}>
              <Text style={styles.link}>{t('auth.backToSignIn')}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h1, color: colors.text, textAlign: 'center' },
  text: { color: colors.textMuted, textAlign: 'center', lineHeight: 22, fontSize: 15 },
  actions: { width: '100%', gap: spacing.md, marginTop: spacing.lg },
  linkRow: { alignItems: 'center', padding: spacing.sm },
  link: { color: colors.primary, fontWeight: '700' },
});
