import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { BookmarkButton } from '@/components/BookmarkButton';
import { useToast } from '@/components/Toast';
import { fetchManual } from '@/lib/api';
import { downloadAndShare } from '@/lib/download';
import type { Manual } from '@/lib/supabase';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';

export default function ManualDetail() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [manual, setManual] = useState<Manual | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [lang, setLang] = useState<'en' | 'es'>(
    (i18n.language as 'en' | 'es') ?? 'en'
  );

  useEffect(() => {
    fetchManual(String(id))
      .then((m) => {
        setManual(m);
        if (m) {
          if (!m.pdf_url_en && m.pdf_url_es) setLang('es');
          else if (!m.pdf_url_es && m.pdf_url_en) setLang('en');
        }
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, [id]);

  const pdfUrl = useMemo(() => {
    if (!manual) return null;
    return lang === 'es' ? manual.pdf_url_es : manual.pdf_url_en;
  }, [manual, lang]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.text} style={{ marginTop: spacing.xxl }} />
      </Screen>
    );
  }

  if (!manual) {
    return (
      <Screen>
        <Text style={{ color: colors.text }}>Not found</Text>
      </Screen>
    );
  }

  const title = i18n.language === 'es' ? manual.title_es : manual.title_en;
  const desc =
    i18n.language === 'es' ? manual.description_es : manual.description_en;

  async function openExternal() {
    if (!pdfUrl) return;
    if (Platform.OS === 'web') {
      window.open(pdfUrl, '_blank');
    } else {
      await WebBrowser.openBrowserAsync(pdfUrl).catch(() =>
        Linking.openURL(pdfUrl)
      );
    }
  }

  async function onDownload() {
    if (!pdfUrl || !manual) return;
    const baseTitle = lang === 'es' ? manual.title_es : manual.title_en;
    const filename = `${baseTitle}-${lang}.pdf`;
    try {
      setDownloading(true);
      await downloadAndShare(pdfUrl, filename);
      if (Platform.OS !== 'web') toast.success(t('manuals.downloaded'));
    } catch (err: any) {
      toast.error(err?.message ?? 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  const langOptions: { code: 'en' | 'es'; label: string; flag: string; available: boolean }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸', available: !!manual.pdf_url_en },
    { code: 'es', label: 'Español', flag: '🇪🇸', available: !!manual.pdf_url_es },
  ].filter((o) => o.available) as any;

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero with thumbnail backdrop */}
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.topBtn}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.bookmarkWrap}>
              <BookmarkButton type="manual" id={manual.id} size={22} />
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.thumbShadow}>
              <Image
                source={manual.thumbnail_url}
                style={styles.thumb}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.pdfBadge}>
                <Ionicons name="document-text" size={11} color="#fff" />
                <Text style={styles.pdfBadgeText}>PDF</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>{t('manuals.title').toUpperCase()}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>

          {/* Meta cards row */}
          <View style={styles.metaRow}>
            {manual.page_count ? (
              <View style={styles.metaCard}>
                <Ionicons name="layers-outline" size={18} color={colors.primary} />
                <Text style={styles.metaValue}>{manual.page_count}</Text>
                <Text style={styles.metaLabel}>{t('manuals.pages')}</Text>
              </View>
            ) : null}
            <View style={styles.metaCard}>
              <Ionicons name="language-outline" size={18} color={colors.primary} />
              <Text style={styles.metaValue}>{langOptions.length}</Text>
              <Text style={styles.metaLabel}>{t('manuals.language')}</Text>
            </View>
            <View style={styles.metaCard}>
              <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
              <Text style={styles.metaValue}>PDF</Text>
              <Text style={styles.metaLabel}>Format</Text>
            </View>
          </View>

          {desc ? (
            <View style={styles.descCard}>
              <Text style={styles.cardTitle}>About</Text>
              <Text style={styles.desc}>{desc}</Text>
            </View>
          ) : null}

          {/* Language segment selector */}
          {langOptions.length > 1 ? (
            <View style={styles.langSegment}>
              {langOptions.map((opt) => (
                <Pressable
                  key={opt.code}
                  onPress={() => setLang(opt.code)}
                  style={[
                    styles.langOption,
                    lang === opt.code && styles.langOptionActive,
                  ]}
                >
                  <Text style={styles.langFlag}>{opt.flag}</Text>
                  <Text
                    style={[
                      styles.langText,
                      lang === opt.code && styles.langTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable
              onPress={openExternal}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="open-outline" size={18} color={colors.text} />
              <Text style={styles.actionLabel}>{t('manuals.openPdf')}</Text>
            </Pressable>
            <Pressable
              onPress={onDownload}
              disabled={downloading}
              style={({ pressed }) => [
                styles.actionBtnPrimary,
                pressed && { opacity: 0.88 },
              ]}
            >
              {downloading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="download-outline" size={18} color="#fff" />
              )}
              <Text style={styles.actionLabelPrimary}>
                {t('manuals.downloadPdf')}
              </Text>
            </Pressable>
          </View>

          {/* Embedded viewer */}
          {pdfUrl ? (
            <View style={styles.viewerCard}>
              <View style={styles.viewerHeader}>
                <View style={styles.viewerDot} />
                <View style={[styles.viewerDot, { backgroundColor: '#F1C40F' }]} />
                <View style={[styles.viewerDot, { backgroundColor: '#27AE60' }]} />
                <Text style={styles.viewerTitle}>{title}.pdf</Text>
              </View>
              <View style={styles.viewerBody}>
                {Platform.OS === 'web' ? (
                  <iframe
                    src={pdfUrl}
                    style={{
                      width: '100%',
                      height: 620,
                      border: 'none',
                      background: '#fff',
                    }}
                  />
                ) : (
                  <WebView
                    source={{
                      uri:
                        Platform.OS === 'android'
                          ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`
                          : pdfUrl,
                    }}
                    style={{ flex: 1, backgroundColor: '#fff' }}
                    startInLoadingState
                  />
                )}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxxl },
  hero: {
    backgroundColor: colors.bgElevated,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookmarkWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  thumbShadow: {
    width: 180,
    height: 240,
    borderRadius: radius.lg,
    overflow: 'visible',
    ...shadow.card,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  pdfBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pdfBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },

  body: { padding: spacing.lg, gap: spacing.lg },
  titleBlock: { gap: spacing.xs, alignItems: 'center' },
  eyebrow: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontSize: 11,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 32,
  },

  metaRow: { flexDirection: 'row', gap: spacing.sm },
  metaCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  metaValue: { ...typography.h3, color: colors.text, fontSize: 18 },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 10,
  },

  descCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  desc: { color: colors.text, lineHeight: 22 },

  langSegment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  langOptionActive: { backgroundColor: colors.primary },
  langFlag: { fontSize: 16 },
  langText: { ...typography.bodyBold, color: colors.textMuted },
  langTextActive: { color: '#fff' },

  actions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLabel: { color: colors.text, fontWeight: '700' },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  actionLabelPrimary: { color: '#fff', fontWeight: '700' },

  viewerCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EB5757',
  },
  viewerTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.textMuted,
    marginRight: 30,
  },
  viewerBody: {
    height: 620,
    backgroundColor: '#fff',
  },
});
