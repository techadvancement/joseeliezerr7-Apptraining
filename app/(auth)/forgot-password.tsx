import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthCard } from '@/components/AuthCard';
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

const schema = z.object({ email: z.string().email() });

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError(null);
    const result = schema.safeParse({ email });
    if (!result.success) {
      setError(t('auth.errors.emailInvalid'));
      return;
    }
    if (!SUPABASE_CONFIGURED) {
      setSent(true);
      return;
    }
    try {
      setLoading(true);
      const redirectTo = Linking.createURL('reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <AuthCard gap={spacing.xl}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>{t('auth.forgotTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.forgotSubtitle')}</Text>
          </View>

          {sent ? (
            <View style={styles.successBox}>
              <Ionicons name="mail" size={36} color={colors.primary} />
              <Text style={styles.successTitle}>{t('auth.forgotSentTitle')}</Text>
              <Text style={styles.successText}>
                {t('auth.forgotSentBody', { email })}
              </Text>
              <Link href="/(auth)/login" asChild>
                <Button label={t('auth.signIn')} variant="secondary" fullWidth />
              </Link>
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label={t('auth.email')}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                error={error ?? undefined}
              />
              <Button
                label={t('auth.forgotCta')}
                onPress={onSubmit}
                loading={loading}
                fullWidth
              />
            </View>
          )}
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', paddingVertical: spacing.xl },
  headerRow: { flexDirection: 'row' },
  hero: { gap: spacing.xs },
  title: { ...typography.h1, color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  form: { gap: spacing.lg },
  successBox: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  successTitle: { ...typography.h3, color: colors.text },
  successText: { color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
