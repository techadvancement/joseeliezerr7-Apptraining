import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { thumb } from '@/lib/image';
import type { Manual } from '@/lib/supabase';

type Variant = 'row' | 'cover';

export function ManualCard({
  manual,
  variant = 'row',
  width,
}: {
  manual: Manual;
  variant?: Variant;
  width?: number;
}) {
  const { i18n, t } = useTranslation();
  const pathname = usePathname();
  const lang = i18n.language as 'en' | 'es';
  const title = lang === 'es' ? manual.title_es : manual.title_en;
  const desc =
    lang === 'es' ? manual.description_es : manual.description_en;
  const availableLangs = [
    manual.pdf_url_en ? 'EN' : null,
    manual.pdf_url_es ? 'ES' : null,
  ].filter(Boolean) as string[];
  const linkHref = {
    pathname: '/manuals/[id]' as const,
    params: { id: manual.id, from: pathname || '/' },
  };

  if (variant === 'cover') {
    return (
      <Link href={linkHref} asChild>
        <Pressable
          style={({ pressed }) => [
            styles.coverCard,
            width ? { width } : null,
            pressed && styles.coverPressed,
          ]}
        >
          <View
            style={[
              styles.coverThumbWrap,
              width
                ? { width, height: Math.round((width * 11) / 8) }
                : { width: 140, height: Math.round((140 * 11) / 8) },
            ]}
          >
            <Image
              source={thumb(manual.thumbnail_url, (width ?? 140) * 2)}
              contentFit="cover"
              transition={200}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.thumbGlare} />
            <View style={styles.coverPdfBadge}>
              <Ionicons name="document-text" size={10} color="#fff" />
              <Text style={styles.pdfText}>PDF</Text>
            </View>
            <View style={styles.coverLangs}>
              {availableLangs.map((l) => (
                <View key={l} style={styles.coverLangBadge}>
                  <Text style={styles.coverLangText}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text numberOfLines={2} style={styles.coverTitle}>{title}</Text>
          {manual.page_count ? (
            <View style={styles.coverMeta}>
              <Ionicons name="layers-outline" size={10} color={colors.textMuted} />
              <Text style={styles.coverMetaText}>
                {manual.page_count} {t('manuals.pages')}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Link>
    );
  }

  return (
    <Link href={linkHref} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.thumbWrap}>
          <View style={styles.thumbShadow}>
            <Image
              source={thumb(manual.thumbnail_url, 240)}
              contentFit="cover"
              transition={200}
              style={styles.thumb}
            />
            <View style={styles.thumbGlare} />
          </View>
          <View style={styles.pdfBadge}>
            <Ionicons name="document-text" size={11} color="#fff" />
            <Text style={styles.pdfText}>PDF</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={{ gap: 4 }}>
            <Text numberOfLines={2} style={styles.title}>
              {title}
            </Text>
            {desc ? (
              <Text numberOfLines={2} style={styles.desc}>
                {desc}
              </Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            <View style={styles.langs}>
              {availableLangs.map((l) => (
                <View key={l} style={styles.langBadge}>
                  <Text style={styles.langText}>{l}</Text>
                </View>
              ))}
              {manual.page_count ? (
                <View style={styles.metaPill}>
                  <Ionicons name="layers-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.meta}>
                    {manual.page_count} {t('manuals.pages')}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.arrow}>
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  thumbWrap: {
    width: 96,
    height: 132,
    position: 'relative',
  },
  thumbShadow: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    ...shadow.card,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbGlare: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pdfBadge: {
    position: 'absolute',
    top: 6,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  pdfText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 17, lineHeight: 22 },
  desc: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  langs: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  langBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + '22',
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  langText: { fontSize: 10, color: colors.primary, fontWeight: '800', letterSpacing: 0.5 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
  },
  meta: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cover (portrait book-cover) variant
  coverCard: {
    gap: spacing.sm,
    flexShrink: 0,
  },
  coverPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  coverThumbWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
    ...shadow.card,
  },
  coverPdfBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
  },
  coverLangs: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  coverLangBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  coverLangText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  coverTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14, lineHeight: 18 },
  coverMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coverMetaText: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
});
