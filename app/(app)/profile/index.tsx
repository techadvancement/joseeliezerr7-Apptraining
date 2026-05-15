import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { CategoryChip } from '@/components/CategoryChip';
import { useAuth, useIsAdmin } from '@/lib/auth';
import { setLanguage } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const isAdmin = useIsAdmin();

  function confirmSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm(t('auth.signOut') + '?')) signOut();
      return;
    }
    Alert.alert(t('auth.signOut'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  }

  async function changeLang(lng: 'en' | 'es') {
    await setLanguage(lng);
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          {profile?.avatar_url ? (
            <Image source={profile.avatar_url} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.full_name ?? user?.email ?? '?')[0]?.toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {profile?.country ? (
            <View style={styles.countryRow}>
              <Ionicons name="location" size={12} color={colors.textMuted} />
              <Text style={styles.country}>{profile.country}</Text>
            </View>
          ) : null}
          <Link href="/profile/edit" asChild>
            <Pressable style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={styles.editText}>{t('auth.editProfile')}</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.language')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <CategoryChip
              label={t('common.english')}
              selected={i18n.language === 'en'}
              onPress={() => changeLang('en')}
            />
            <CategoryChip
              label={t('common.spanish')}
              selected={i18n.language === 'es'}
              onPress={() => changeLang('es')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
          <Pressable
            onPress={() => router.push('/profile/library')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
              <Ionicons name="library" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{t('profile.library')}</Text>
                <Text style={styles.rowSub}>{t('profile.librarySub')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          {isAdmin ? (
            <Pressable
              onPress={() => router.push('/admin')}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <Text style={styles.rowLabel}>Panel administrativo</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.security')}</Text>
          <Pressable
            onPress={() => router.push('/profile/change-password')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.rowLabel}>{t('profile.changePassword')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/profile/two-factor')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.rowLabel}>{t('auth.twoFactor')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.legal')}</Text>
          <Pressable
            onPress={() => router.push('/legal/terms')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.rowLabel}>{t('legal.termsLink')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/legal/privacy')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.rowLabel}>{t('legal.privacyLink')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('profile.version')}</Text>
            <Text style={styles.rowValue}>
              {Constants.expoConfig?.version ?? '—'}
            </Text>
          </View>
        </View>

        <Button
          label={t('auth.signOut')}
          variant="secondary"
          onPress={confirmSignOut}
          fullWidth
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>{t('profile.danger')}</Text>
          <Pressable
            onPress={() => router.push('/profile/delete-account')}
            style={({ pressed }) => [styles.dangerRow, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.dangerLabel}>{t('profile.deleteAccount')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { ...typography.h2, color: colors.text },
  email: { color: colors.textMuted },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  country: { color: colors.textMuted, ...typography.caption },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editText: { color: colors.primary, fontWeight: '700' },
  section: { gap: spacing.md },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: { color: colors.text, ...typography.bodyBold },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  rowValue: { color: colors.textMuted },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  dangerLabel: { color: colors.danger, ...typography.bodyBold },
});
