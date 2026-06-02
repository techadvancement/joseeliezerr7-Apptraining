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
import { thumb } from '@/lib/image';
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
        <View style={styles.inner}>
        {/* Hero header */}
        <View style={styles.header}>
          <View style={styles.avatarRing}>
            {profile?.avatar_url ? (
              <Image source={thumb(profile.avatar_url, 192)} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.full_name ?? user?.email ?? '?')[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
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

        {/* Quick access cards: Library + Admin (if admin) */}
        <View style={styles.quickCards}>
          <Pressable
            onPress={() => router.push('/profile/library')}
            style={({ pressed }) => [styles.featureRow, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="library" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t('profile.library')}</Text>
              <Text style={styles.rowSub}>{t('profile.librarySub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/profile/notes')}
            style={({ pressed }) => [styles.featureRow, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.featureIcon, { backgroundColor: '#F59E0B22' }]}>
              <Ionicons name="document-text" size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t('profile.notes')}</Text>
              <Text style={styles.rowSub}>{t('profile.notesSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          {isAdmin ? (
            <Pressable
              onPress={() => router.push('/admin')}
              style={({ pressed }) => [styles.featureRow, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: '#10B98122' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{t('admin.panelTitle')}</Text>
                <Text style={styles.rowSub}>{t('admin.manageContent')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="language-outline" size={18} color={colors.textMuted} />
              <Text style={styles.rowLabel}>{t('common.language')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
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
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.security')}</Text>
          <Pressable
            onPress={() => router.push('/profile/change-password')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="key-outline" size={18} color={colors.textMuted} />
              <Text style={styles.rowLabel}>{t('profile.changePassword')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.legal')}</Text>
          <Pressable
            onPress={() => router.push('/legal/terms')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
              <Text style={styles.rowLabel}>{t('legal.termsLink')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/legal/privacy')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <Text style={styles.rowLabel}>{t('legal.privacyLink')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              <Text style={styles.rowLabel}>{t('profile.version')}</Text>
            </View>
            <Text style={styles.rowValue}>
              {Constants.expoConfig?.version ?? '—'}
            </Text>
          </View>
        </View>

        {/* Sign out */}
        <Button
          label={t('auth.signOut')}
          variant="secondary"
          onPress={confirmSignOut}
          fullWidth
        />

        {/* Danger zone */}
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
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  inner: {
    width: '100%',
    maxWidth: 720,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  header: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  avatarRing: {
    padding: 3,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.primary + '55',
  },
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
  quickCards: { gap: spacing.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
