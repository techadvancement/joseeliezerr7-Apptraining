import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius: br = radius.sm,
  style,
}: Props) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as ViewStyle['width'], height, borderRadius: br, opacity: pulse },
        style,
      ]}
    />
  );
}

export function VideoCardSkeleton({ width = 240 }: { width?: number }) {
  return (
    <View style={{ width, gap: 8 }}>
      <Skeleton width={width} height={(width as number) * 0.5625} borderRadius={radius.lg} />
      <Skeleton width="80%" height={14} />
      <Skeleton width="50%" height={12} />
    </View>
  );
}

export function ManualCardSkeleton() {
  return (
    <View style={styles.manualRow}>
      <Skeleton width={80} height={110} borderRadius={radius.md} />
      <View style={{ flex: 1, gap: 8, justifyContent: 'space-between' }}>
        <Skeleton width="90%" height={16} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

export function HeroSkeleton() {
  return (
    <View style={styles.hero}>
      <View style={styles.heroOverlay}>
        <Skeleton width={70} height={14} borderRadius={radius.pill} />
        <Skeleton width="80%" height={24} />
        <Skeleton width="55%" height={16} />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <Skeleton width={120} height={42} borderRadius={radius.pill} />
          <Skeleton width={42} height={42} borderRadius={radius.pill} />
        </View>
      </View>
    </View>
  );
}

export function RailSkeleton({
  cardWidth = 240,
  count = 4,
}: {
  cardWidth?: number;
  count?: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      style={{ flexGrow: 0 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} width={cardWidth} />
      ))}
    </ScrollView>
  );
}

export function CategoryTileSkeleton() {
  return <Skeleton width="100%" height={120} borderRadius={radius.lg} />;
}

export function SectionHeaderSkeleton() {
  return (
    <View style={styles.sectionHeader}>
      <Skeleton width={160} height={18} />
      <Skeleton width={60} height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceAlt },
  manualRow: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  rail: {
    gap: spacing.lg,
    paddingRight: spacing.lg,
    alignItems: 'flex-start',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
