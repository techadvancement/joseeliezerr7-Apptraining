import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { fetchAdminStats, type AdminStats } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';

const SECTIONS = [
  {
    href: '/admin/series',
    icon: 'albums' as const,
    title: 'Series',
    sub: 'Programas con varios videos en orden',
    color: '#EC4899',
  },
  {
    href: '/admin/videos',
    icon: 'play-circle' as const,
    title: 'Videos',
    sub: 'Subir, editar y organizar videos',
    color: '#5B7CFA',
  },
  {
    href: '/admin/manuals',
    icon: 'library' as const,
    title: 'Manuales',
    sub: 'PDFs en inglés y español',
    color: '#F59E0B',
  },
  {
    href: '/admin/categories',
    icon: 'apps' as const,
    title: 'Categorías',
    sub: 'Programas de entrenamiento',
    color: '#10B981',
  },
  {
    href: '/admin/users',
    icon: 'people' as const,
    title: 'Usuarios',
    sub: 'Gestionar técnicos y administradores',
    color: '#8B5CF6',
  },
] as const;

export default function AdminDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((e) => toast.error(e?.message ?? 'Error cargando stats'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>PANEL ADMIN</Text>
            <Text style={styles.title}>Hola, {profile?.full_name?.split(' ')[0] ?? 'admin'}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Videos" value={stats?.videos} loading={loading} icon="play-circle" color="#5B7CFA" />
          <StatCard label="Manuales" value={stats?.manuals} loading={loading} icon="library" color="#F59E0B" />
          <StatCard label="Categorías" value={stats?.categories} loading={loading} icon="apps" color="#10B981" />
          <StatCard label="Usuarios" value={stats?.users} loading={loading} icon="people" color="#8B5CF6" />
        </View>

        <Text style={styles.sectionTitle}>Gestionar contenido</Text>

        <View style={styles.menu}>
          {SECTIONS.map((s) => (
            <Pressable
              key={s.href}
              onPress={() => router.push(s.href)}
              style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.menuIcon, { backgroundColor: s.color + '22' }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{s.title}</Text>
                <Text style={styles.menuSub}>{s.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  loading,
  icon,
  color,
}: {
  label: string;
  value?: number;
  loading: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={styles.statValue}>{value ?? 0}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: { color: colors.primary, fontWeight: '800', letterSpacing: 1.2, fontSize: 11 },
  title: { ...typography.h1, color: colors.text, fontSize: 24 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#10B98122',
    borderWidth: 1,
    borderColor: '#10B98155',
  },
  adminBadgeText: { color: '#10B981', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
    ...shadow.card,
  },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...typography.h2, color: colors.text, fontSize: 24 },
  statLabel: { color: colors.textMuted, ...typography.caption, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionTitle: { color: colors.textMuted, ...typography.caption, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm },
  menu: { gap: spacing.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  menuSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
});
