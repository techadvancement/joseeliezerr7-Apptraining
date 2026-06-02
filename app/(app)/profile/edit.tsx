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
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CountryPicker } from '@/components/CountryPicker';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { SUPABASE_CONFIGURED } from '@/lib/supabase';
import { pickAvatarImage, uploadAvatar } from '@/lib/avatar';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function EditProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; country?: string; root?: string }>({});
  const [saved, setSaved] = useState(false);

  async function onPickAvatar() {
    try {
      const picked = await pickAvatarImage();
      if (!picked) return;
      if (!SUPABASE_CONFIGURED) {
        setAvatarUrl(picked.uri);
        return;
      }
      if (!user) return;
      setUploadingAvatar(true);
      const url = await uploadAvatar(user.id, picked);
      setAvatarUrl(url);
      await updateProfile({ avatar_url: url });
      toast.success(t('auth.profileUpdated'));
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onSave() {
    const e: typeof errors = {};
    if (fullName.trim().length < 2) e.fullName = t('auth.errors.nameRequired');
    if (country.trim().length < 2) e.country = t('auth.errors.countryRequired');
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    try {
      setLoading(true);
      await updateProfile({
        full_name: fullName.trim(),
        country: country.trim(),
        phone: phone.trim() || null,
      });
      setSaved(true);
      setTimeout(() => router.back(), 700);
    } catch (err: any) {
      setErrors({ root: err?.message ?? 'Update failed' });
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
            <Text style={styles.title}>{t('auth.editProfile')}</Text>
          </View>

          <View style={styles.avatarRow}>
            <Pressable onPress={onPickAvatar} style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={avatarUrl} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>
                    {(fullName || user?.email || '?')[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </Pressable>
            <Pressable onPress={onPickAvatar} disabled={uploadingAvatar}>
              <Text style={styles.changePhoto}>
                {uploadingAvatar ? t('common.loading') : t('auth.changePhoto')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <Input
              label={t('auth.fullName')}
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
            />
            <CountryPicker
              label={t('auth.country')}
              value={country}
              onChange={(c) => setCountry(i18n.language === 'es' ? c.name_es : c.name_en)}
              error={errors.country}
            />
            <Input
              label={t('auth.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            {errors.root ? <Text style={styles.error}>{errors.root}</Text> : null}
            {saved ? (
              <Text style={styles.success}>{t('auth.profileUpdated')}</Text>
            ) : null}

            <Button
              label={t('common.save')}
              onPress={onSave}
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
  avatarRow: { alignItems: 'center', gap: spacing.sm },
  avatarWrap: { width: 96, height: 96, borderRadius: 48 },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceAlt,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 38, fontWeight: '800' },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: { color: colors.primary, fontWeight: '700' },
  form: { gap: spacing.lg },
  error: { color: colors.danger, ...typography.caption },
  success: { color: colors.success, ...typography.caption },
});
