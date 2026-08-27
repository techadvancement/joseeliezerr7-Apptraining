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
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthCard } from '@/components/AuthCard';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing, typography } from '@/constants/theme';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; root?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setErrors({});
    const result = schema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((i) => {
        const field = i.path[0] as 'email' | 'password';
        if (field === 'email') fieldErrors.email = t('auth.errors.emailInvalid');
        if (field === 'password')
          fieldErrors.password = t('auth.errors.passwordShort');
      });
      setErrors(fieldErrors);
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace('/(app)');
    } catch (err: any) {
      setErrors({ root: err?.message ?? t('auth.errors.signInFailed') });
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <AuthCard gap={spacing.xl}>
            <View style={styles.hero}>
              <Text style={styles.title}>{t('auth.loginHero')}</Text>
              <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
            </View>

            <View style={styles.form}>
              <Input
                label={t('auth.email')}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                onSubmitEditing={onSubmit}
              />
              <Input
                label={t('auth.password')}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                onSubmitEditing={onSubmit}
                rightSlot={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      showPassword ? 'auth.hidePassword' : 'auth.showPassword'
                    )}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                }
              />

              <View style={styles.forgotRow}>
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable hitSlop={6}>
                    <Text style={styles.forgotText}>{t('auth.forgotLink')}</Text>
                  </Pressable>
                </Link>
              </View>

              {errors.root ? (
                <View style={styles.alert} accessibilityRole="alert">
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={colors.danger}
                    style={styles.alertIcon}
                  />
                  <Text style={styles.alertText}>{errors.root}</Text>
                </View>
              ) : null}

              <Button
                label={t('auth.loginCta')}
                onPress={onSubmit}
                loading={loading}
                fullWidth
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={6}>
                  <Text style={styles.link}>{t('auth.signUp')}</Text>
                </Pressable>
              </Link>
            </View>
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  hero: { gap: spacing.sm },
  title: {
    ...typography.h2,
    fontSize: 22,
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  form: { gap: spacing.lg },
  forgotRow: { alignItems: 'flex-end', marginTop: -spacing.sm },
  forgotText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger + '55',
    backgroundColor: colors.danger + '14',
  },
  alertIcon: { marginTop: 1 },
  alertText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  footerText: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
