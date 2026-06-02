import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, typography } from '@/constants/theme';

const ONBOARDING_KEY = 'app.onboarded';

export async function hasSeenOnboarding(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ONBOARDING_KEY);
  return v === '1';
}

export async function markOnboarded(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, '1');
}

type Tone = 'primary' | 'accent' | 'success' | 'violet';

const TONES: Record<Tone, { primary: string; secondary: string }> = {
  primary: { primary: colors.primary, secondary: '#7C5BFA' },
  accent: { primary: colors.accent, secondary: '#FB923C' },
  success: { primary: colors.success, secondary: '#10B981' },
  violet: { primary: '#8B5CF6', secondary: '#EC4899' },
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  tone: Tone;
};

function SlideView({ width, slide }: { width: number; slide: Slide }) {
  const t = TONES[slide.tone];
  return (
    <View style={[styles.slide, { width }]}>
      <View style={styles.illustration}>
        <View
          style={[
            styles.blobLg,
            {
              backgroundColor: hexToRgba(t.primary, 0.18),
              borderColor: hexToRgba(t.primary, 0.25),
            },
          ]}
        />
        <View
          style={[
            styles.blobMd,
            {
              backgroundColor: hexToRgba(t.secondary, 0.22),
              borderColor: hexToRgba(t.secondary, 0.3),
            },
          ]}
        />
        <View
          style={[styles.dot, styles.dotA, { backgroundColor: hexToRgba(t.primary, 0.55) }]}
        />
        <View
          style={[styles.dot, styles.dotB, { backgroundColor: hexToRgba(t.secondary, 0.55) }]}
        />
        <View
          style={[styles.dot, styles.dotC, { backgroundColor: hexToRgba(t.primary, 0.35) }]}
        />
        <View
          style={[styles.dot, styles.dotD, { backgroundColor: hexToRgba(t.secondary, 0.4) }]}
        />
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.bgElevated,
              borderColor: hexToRgba(t.primary, 0.4),
              shadowColor: t.primary,
            },
          ]}
        >
          <Ionicons name={slide.icon} size={52} color={t.primary} />
        </View>
      </View>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.body}>{slide.body}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [containerW, setContainerW] = useState(0);

  const slides: Slide[] = [
    { icon: 'videocam', title: t('onboarding.s1.title'), body: t('onboarding.s1.body'), tone: 'primary' },
    { icon: 'library', title: t('onboarding.s2.title'), body: t('onboarding.s2.body'), tone: 'accent' },
    { icon: 'cloud-download', title: t('onboarding.s4.title'), body: t('onboarding.s4.body'), tone: 'success' },
    { icon: 'globe', title: t('onboarding.s3.title'), body: t('onboarding.s3.body'), tone: 'violet' },
  ];

  async function finish() {
    await markOnboarded();
    router.replace('/(auth)/login');
  }

  function next() {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  }

  function back() {
    if (index > 0) {
      listRef.current?.scrollToIndex({ index: index - 1, animated: true });
    }
  }

  function onViewableChanged({ viewableItems }: { viewableItems: ViewToken[] }) {
    if (viewableItems.length > 0) {
      setIndex(viewableItems[0]!.index ?? 0);
    }
  }

  function onContainerLayout(e: LayoutChangeEvent) {
    setContainerW(e.nativeEvent.layout.width);
  }

  return (
    <Screen padded={false}>
      <View style={styles.topRow}>
        {index > 0 ? (
          <Pressable
            onPress={back}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.back')}
            style={styles.topBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.topBtn} />
        )}
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>{t('onboarding.skip')}</Text>
        </Pressable>
      </View>

      <View style={styles.listWrap} onLayout={onContainerLayout}>
        {containerW > 0 ? (
          <FlatList
            ref={listRef}
            data={slides}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            getItemLayout={(_, i) => ({ length: containerW, offset: containerW * i, index: i })}
            renderItem={({ item }) => <SlideView width={containerW} slide={item} />}
          />
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot2, i === index && styles.dot2Active]}
            />
          ))}
        </View>
        <Button
          label={index === slides.length - 1 ? t('onboarding.cta') : t('onboarding.next')}
          onPress={next}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const ILLUSTRATION_SIZE = 220;

const styles = StyleSheet.create({
  topRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { color: colors.textMuted, fontWeight: '700' },
  listWrap: { flex: 1 },
  slide: {
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  illustration: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  blobLg: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    borderWidth: 1,
    top: 10,
    left: 8,
  },
  blobMd: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 14,
    right: 10,
  },
  dot: { position: 'absolute', borderRadius: radius.pill },
  dotA: { width: 10, height: 10, top: 24, right: 30 },
  dotB: { width: 7, height: 7, bottom: 30, left: 24 },
  dotC: { width: 6, height: 6, top: 96, right: 12 },
  dotD: { width: 5, height: 5, top: 40, left: 30 },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { ...typography.h1, color: colors.text, textAlign: 'center', maxWidth: 420 },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 420,
  },
  footer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  dots: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  dot2: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
  },
  dot2Active: { backgroundColor: colors.primary, width: 28 },
});
