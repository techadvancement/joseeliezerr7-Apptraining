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
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { user, deleteAccount } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const expected = (user?.email ?? '').trim().toLowerCase();
  const canDelete = expected.length > 0 && confirmText.trim().toLowerCase() === expected;

  async function onDelete() {
    try {
      setLoading(true);
      await deleteAccount();
      toast.success(t('auth.signOut'));
      router.replace('/(auth)/login');
    } catch (err: any) {
      toast.error(err?.message ?? 'Delete failed');
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
            <Text style={styles.title}>{t('profile.deleteAccount')}</Text>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={28} color={colors.danger} />
            <Text style={styles.warningText}>{t('profile.deleteAccountWarning')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={user?.email ?? ''}
              placeholder={user?.email ?? ''}
              autoCapitalize="none"
              value={confirmText}
              onChangeText={setConfirmText}
            />
            <Button
              label={t('profile.deleteAccountConfirm')}
              onPress={onDelete}
              loading={loading}
              disabled={!canDelete}
              style={{ backgroundColor: colors.danger }}
              fullWidth
            />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onPress={() => router.back()}
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
  warningBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: radius.md,
  },
  warningText: { flex: 1, color: colors.text, lineHeight: 22 },
  form: { gap: spacing.lg },
});
