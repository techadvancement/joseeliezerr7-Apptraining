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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthCard } from '@/components/AuthCard';
import { useToast } from '@/components/Toast';
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit() {
    const e: typeof errors = {};
    if (password.length < 8) e.password = t('auth.errors.passwordShort');
    if (password !== confirm) e.confirm = t('auth.errors.passwordsDontMatch');
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (!SUPABASE_CONFIGURED) {
      toast.success(t('profile.passwordChanged'));
      router.replace('/(auth)/login');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t('profile.passwordChanged'));
      router.replace('/(auth)/login');
    } catch (err: any) {
      toast.error(err?.message ?? 'Reset failed');
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
            <Text style={styles.subtitle}>{t('profile.newPassword')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t('profile.newPassword')}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
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
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
            />

            <Button label={t('common.save')} onPress={onSubmit} loading={loading} fullWidth />
          </View>
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
});
