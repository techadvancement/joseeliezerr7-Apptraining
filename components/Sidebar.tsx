import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useAuth } from '@/lib/auth';
import { thumb } from '@/lib/image';
import { colors, radius, spacing, typography } from '@/constants/theme';

export const SIDEBAR_WIDTH = 240;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Item = {
  href: string;
  label: string;
  icon: IconName;
  match: (segs: string[]) => boolean;
};

export function Sidebar() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, user } = useAuth();
  const segments = useSegments() as string[];

  const inApp = segments.includes('(app)');
  const after = inApp ? segments.slice(segments.indexOf('(app)') + 1) : segments;
  const top = after[0] ?? '';

  const items: Item[] = [
    {
      href: '/',
      label: t('tabs.home'),
      icon: 'home',
      match: () => top === '' || top === 'index',
    },
    {
      href: '/videos',
      label: t('tabs.videos'),
      icon: 'play-circle',
      match: () => top === 'videos',
    },
    {
      href: '/manuals',
      label: t('tabs.manuals'),
      icon: 'library',
      match: () => top === 'manuals',
    },
    {
      href: '/search',
      label: t('search.title'),
      icon: 'search',
      match: () => top === 'search',
    },
    {
      href: '/profile',
      label: t('tabs.profile'),
      icon: 'person-circle',
      match: () => top === 'profile',
    },
  ];

  if (profile?.role === 'admin') {
    items.push({
      href: '/admin',
      label: t('tabs.admin'),
      icon: 'shield-checkmark',
      match: () => top === 'admin',
    });
  }

  const initial = (profile?.full_name ?? user?.email ?? '?')[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.wrap}>
      <View style={styles.brand}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.brandIcon}
          contentFit="contain"
        />
        <Text style={styles.brandText}>{t('common.appName')}</Text>
      </View>

      <View style={styles.nav}>
        {items.map((it) => {
          const active = it.match(segments);
          return (
            <Pressable
              key={it.href}
              onPress={() => router.push(it.href as any)}
              style={({ pressed }) => [
                styles.navItem,
                active && styles.navItemActive,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="link"
              accessibilityLabel={it.label}
            >
              <Ionicons
                name={it.icon}
                size={20}
                color={active ? colors.text : colors.textMuted}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push('/profile')}
        style={({ pressed }) => [styles.userRow, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.avatar}>
          {profile?.avatar_url ? (
            <Image
              source={thumb(profile.avatar_url, 80)}
              style={{ width: 36, height: 36, borderRadius: 18 }}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.avatarInitial}>{initial}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.userName} numberOfLines={1}>
            {profile?.full_name ?? user?.email ?? ''}
          </Text>
          <Text style={styles.userSub} numberOfLines={1}>
            {profile?.role === 'admin' ? t('tabs.admin') : t('tabs.profile')}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.bgElevated,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandText: {
    ...typography.h2,
    color: colors.text,
    fontSize: 17,
  },
  nav: { gap: 2, flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  navItemActive: {
    backgroundColor: colors.surface,
  },
  navLabel: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  navLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 15 },
  userName: { ...typography.bodyBold, color: colors.text, fontSize: 13 },
  userSub: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
});
