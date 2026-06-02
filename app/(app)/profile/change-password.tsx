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
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase';
import { colors, spacing, typography } from '@/constants/theme';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
  }>({});
  const [show, setShow] = useState(false);

  async function onSubmit() {
    const e: typeof errors = {};
    if (current.length < 8) e.current = t('auth.errors.passwordShort');
    if (next.length < 8) e.next = t('auth.errors.passwordShort');
    if (next !== confirm) e.confirm = t('auth.errors.passwordsDontMatch');
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (!SUPABASE_CONFIGURED) {
      toast.success(t('profile.passwordChanged'));
      router.back();
      return;
    }

    try {
      setLoading(true);
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: current,
      });
      if (reAuthErr) {
        setErrors({ current: reAuthErr.message });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success(t('profile.passwordChanged'));
      router.back();
    } catch (err: any) {
      toast.error(err?.message ?? 'Update failed');
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
          <View style={styles.inner}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>{t('profile.changePassword')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t('profile.currentPassword')}
              secureTextEntry={!show}
              value={current}
              onChangeText={setCurrent}
              error={errors.current}
              rightSlot={
                <Pressable onPress={() => setShow((v) => !v)}>
                  <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
                </Pressable>
              }
            />
            <Input
              label={t('profile.newPassword')}
              secureTextEntry={!show}
              value={next}
              onChangeText={setNext}
              error={errors.next}
            />
            <Input
              label={t('auth.confirmPassword')}
              secureTextEntry={!show}
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
            />
            <Button
              label={t('common.save')}
              onPress={onSubmit}
              loading={loading}
              fullWidth
            />
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingBottom: spacing.xxxl },
  inner: { width: '100%', maxWidth: 640, padding: spacing.lg, gap: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { ...typography.h2, color: colors.text },
  form: { gap: spacing.lg },
});
