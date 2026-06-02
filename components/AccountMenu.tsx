import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useIsAdmin } from '@/lib/auth';
import { setLanguage } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { thumb } from '@/lib/image';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AccountMenu({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, signOut } = useAuth();
  const isAdmin = useIsAdmin();

  const initial = (profile?.full_name ?? user?.email ?? '?')[0]?.toUpperCase() ?? '?';

  function go(path: string) {
    haptics.selection();
    onClose();
    router.push(path as any);
  }

  async function pickLang(lng: 'en' | 'es') {
    if (i18n.language === lng) return;
    haptics.selection();
    await setLanguage(lng);
  }

  function confirmSignOut() {
    onClose();
    if (Platform.OS === 'web') {
      if (window.confirm(t('auth.signOut') + '?')) signOut();
      return;
    }
    Alert.alert(t('auth.signOut'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
      >
        <View style={styles.handle} />

        {/* Identity header */}
        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            {profile?.avatar_url ? (
              <Image source={thumb(profile.avatar_url, 128)} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {profile?.full_name ?? t('admin.helloFallback')}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
          <Pressable
            onPress={() => go('/profile')}
            style={({ pressed }) => [styles.editPill, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('auth.editProfile')}
          >
            <Text style={styles.editPillText}>{t('auth.editProfile')}</Text>
          </Pressable>
        </View>

        {/* Menu rows */}
        <View style={styles.group}>
          <MenuRow
            icon="library"
            iconColor={colors.primary}
            iconBg={colors.primary + '22'}
            label={t('profile.library')}
            sub={t('profile.librarySub')}
            onPress={() => go('/profile/library')}
          />
          <MenuRow
            icon="bookmark"
            iconColor={colors.accent}
            iconBg={colors.accent + '22'}
            label={t('profile.bookmarks')}
            onPress={() => go('/profile/bookmarks')}
          />
          <MenuRow
            icon="cloud-done"
            iconColor={colors.success}
            iconBg={colors.success + '22'}
            label={t('profile.downloads')}
            onPress={() => go('/profile/downloads')}
          />
          {isAdmin ? (
            <MenuRow
              icon="shield-checkmark"
              iconColor="#10B981"
              iconBg="#10B98122"
              label={t('admin.panelTitle')}
              sub={t('admin.manageContent')}
              onPress={() => go('/admin')}
            />
          ) : null}
        </View>

        {/* Language toggle */}
        <View style={styles.langWrap}>
          <Text style={styles.sectionLabel}>{t('common.language')}</Text>
          <View style={styles.langRow}>
            <LangChip
              label={t('common.english')}
              selected={i18n.language === 'en'}
              onPress={() => pickLang('en')}
            />
            <LangChip
              label={t('common.spanish')}
              selected={i18n.language === 'es'}
              onPress={() => pickLang('es')}
            />
          </View>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={confirmSignOut}
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t('auth.signOut')}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>{t('auth.signOut')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function MenuRow({
  icon,
  iconColor,
  iconBg,
  label,
  sub,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  label: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function LangChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.langChip,
        selected && styles.langChipSelected,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.langChipText, selected && styles.langChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary + '55',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.h3, color: colors.text },
  name: { ...typography.h3, color: colors.text },
  email: { color: colors.textMuted, ...typography.caption },
  editPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  editPillText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  group: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...typography.bodyBold, color: colors.text },
  rowSub: { color: colors.textMuted, ...typography.caption, marginTop: 1 },
  langWrap: { gap: spacing.sm },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  langChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  langChipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  langChipText: { color: colors.text, ...typography.bodyBold },
  langChipTextSelected: { color: colors.primary },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.danger + '15',
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  signOutText: { color: colors.danger, ...typography.bodyBold },
});
