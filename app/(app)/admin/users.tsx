import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/Toast';
import { adminDeleteUser, listAdminUsers, setUserRole, type AdminUser } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function AdminUsers() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const u = await listAdminUsers();
      setUsers(u);
    } catch (e: any) {
      toast.error(e?.message ?? t('admin.errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  function confirmRoleChange(u: AdminUser, newRole: 'user' | 'admin') {
    const name = u.full_name || u.email;
    const message =
      newRole === 'admin'
        ? t('admin.confirms.promote', { name })
        : t('admin.confirms.demote', { name });
    const doIt = async () => {
      try {
        setBusy(u.id);
        await setUserRole(u.id, newRole);
        toast.success(t('admin.toasts.userRoleUpdated'));
        await load();
      } catch (e: any) {
        toast.error(e?.message ?? t('admin.errors.generic'));
      } finally {
        setBusy(null);
      }
    };
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(message)) doIt();
    } else {
      Alert.alert(t('admin.confirms.title'), message, [
        { text: t('admin.confirms.cancel'), style: 'cancel' },
        { text: t('admin.confirms.confirm'), onPress: doIt },
      ]);
    }
  }

  function confirmDelete(u: AdminUser) {
    const name = u.full_name || u.email;
    const message = t('admin.confirms.deleteUser', { name });
    const doIt = async () => {
      try {
        setBusy(u.id);
        await adminDeleteUser(u.id);
        toast.success(t('admin.toasts.userDeleted'));
        await load();
      } catch (e: any) {
        toast.error(e?.message ?? t('admin.errors.generic'));
      } finally {
        setBusy(null);
      }
    };
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(message)) doIt();
    } else {
      Alert.alert(t('admin.users.delete'), message, [
        { text: t('admin.confirms.cancel'), style: 'cancel' },
        { text: t('admin.confirms.delete'), style: 'destructive', onPress: doIt },
      ]);
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString();
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{t('admin.labels.users')}</Text>
            <Text style={styles.title}>{t('admin.titles.usersCount', { count: users.length })}</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('admin.users.searchPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.text} style={{ marginTop: spacing.xxl }} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filtered.map((u) => {
              const isMe = u.id === user?.id;
              const isAdminUser = u.role === 'admin';
              const initials = (u.full_name || u.email)
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase())
                .join('');
              return (
                <View key={u.id} style={styles.row}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: isAdminUser ? '#10B98122' : colors.surfaceAlt },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        { color: isAdminUser ? '#10B981' : colors.text },
                      ]}
                    >
                      {initials || '?'}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {u.full_name || t('admin.users.noName')}
                      </Text>
                      {isAdminUser ? (
                        <View style={styles.adminBadge}>
                          <Ionicons name="shield-checkmark" size={10} color="#10B981" />
                          <Text style={styles.adminBadgeText}>{t('admin.badge')}</Text>
                        </View>
                      ) : null}
                      {isMe ? <Text style={styles.youBadge}>{t('admin.users.you')}</Text> : null}
                    </View>
                    <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
                    <Text style={styles.meta}>
                      {u.country || '—'} · {t('admin.users.signedUp')} {formatDate(u.signed_up_at)}
                      {u.last_sign_in_at ? ` · ${t('admin.users.lastLogin')} ${formatDate(u.last_sign_in_at)}` : ''}
                    </Text>
                  </View>

                  {busy === u.id ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <View style={styles.actions}>
                      {!isMe ? (
                        <Pressable
                          onPress={() => confirmRoleChange(u, isAdminUser ? 'user' : 'admin')}
                          style={styles.iconBtn}
                        >
                          <Ionicons
                            name={isAdminUser ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                            size={18}
                            color={isAdminUser ? colors.textMuted : '#10B981'}
                          />
                        </Pressable>
                      ) : null}
                      {!isMe ? (
                        <Pressable onPress={() => confirmDelete(u)} style={styles.iconBtn}>
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })}
            {filtered.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
                {t('admin.users.noResults')}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Ionicons name="arrow-up-circle-outline" size={16} color="#10B981" />
            <Text style={styles.legendText}>{t('admin.users.promote')}</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="arrow-down-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.legendText}>{t('admin.users.demote')}</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.legendText}>{t('admin.users.delete')}</Text>
          </View>
        </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 1100, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  eyebrow: { color: colors.primary, fontWeight: '800', letterSpacing: 1.2, fontSize: 11 },
  title: { ...typography.h2, color: colors.text, fontSize: 20 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.bodyBold, color: colors.text, fontSize: 15, flexShrink: 1 },
  email: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  meta: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.sm, backgroundColor: '#10B98122',
    borderWidth: 1, borderColor: '#10B98155',
  },
  adminBadgeText: { color: '#10B981', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  youBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.sm, backgroundColor: colors.bgElevated,
    color: colors.textMuted, fontSize: 9, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { color: colors.textMuted, fontSize: 12 },
});
