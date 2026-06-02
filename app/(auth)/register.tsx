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
import { CountryPicker } from '@/components/CountryPicker';
import { AuthCard } from '@/components/AuthCard';
import { useAuth } from '@/lib/auth';
import { SUPABASE_CONFIGURED } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

const schema = z
  .object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    confirm: z.string().min(8),
    country: z.string().min(2),
    phone: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'mismatch',
  });

type Form = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof Form | 'root', string>>;

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { signUp } = useAuth();
  const [form, setForm] = useState<Form>({
    fullName: '',
    email: '',
    password: '',
    confirm: '',
    country: '',
    phone: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit() {
    setErrors({});
    const result = schema.safeParse(form);
    if (!result.success) {
      const fe: FieldErrors = {};
      result.error.issues.forEach((i) => {
        const f = i.path[0] as keyof Form;
        if (f === 'email') fe.email = t('auth.errors.emailInvalid');
        else if (f === 'password') fe.password = t('auth.errors.passwordShort');
        else if (f === 'fullName') fe.fullName = t('auth.errors.nameRequired');
        else if (f === 'country') fe.country = t('auth.errors.countryRequired');
        else if (f === 'confirm') fe.confirm = t('auth.errors.passwordsDontMatch');
      });
      setErrors(fe);
      return;
    }
    try {
      setLoading(true);
      await signUp({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        country: form.country.trim(),
        phone: form.phone?.trim() || undefined,
      });
      if (SUPABASE_CONFIGURED) {
        router.replace({
          pathname: '/(auth)/check-email',
          params: { email: form.email.trim() },
        });
      } else {
        router.replace('/(app)');
      }
    } catch (err: any) {
      setErrors({ root: err?.message ?? 'Sign-up failed' });
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
          <AuthCard maxWidth={480} gap={spacing.xl}>
          <View style={styles.headerRow}>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={12}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </Pressable>
            </Link>
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>{t('auth.registerHero')}</Text>
            <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t('auth.fullName')}
              placeholder="Jane Doe"
              autoComplete="name"
              value={form.fullName}
              onChangeText={(v) => set('fullName', v)}
              error={errors.fullName}
            />
            <Input
              label={t('auth.email')}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(v) => set('email', v)}
              error={errors.email}
            />
            <CountryPicker
              label={t('auth.country')}
              value={form.country}
              onChange={(c) => set('country', i18n.language === 'es' ? c.name_es : c.name_en)}
              error={errors.country}
            />
            <Input
              label={t('auth.phone')}
              placeholder="+1 555 555 5555"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={form.phone}
              onChangeText={(v) => set('phone', v)}
            />
            <Input
              label={t('auth.password')}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoComplete="password-new"
              value={form.password}
              onChangeText={(v) => set('password', v)}
              error={errors.password}
              rightSlot={
                <Pressable onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              }
            />
            <Input
              label={t('auth.confirmPassword')}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoComplete="password-new"
              value={form.confirm}
              onChangeText={(v) => set('confirm', v)}
              error={errors.confirm}
            />

            {errors.root ? (
              <Text style={styles.error}>{errors.root}</Text>
            ) : null}

            <Button
              label={t('auth.registerCta')}
              onPress={onSubmit}
              loading={loading}
              fullWidth
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.haveAccount')}</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.link}>{t('auth.signIn')}</Text>
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
    paddingVertical: spacing.xl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  hero: { gap: spacing.xs },
  title: { ...typography.h1, color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  form: { gap: spacing.lg },
  error: { color: colors.danger, ...typography.caption },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
