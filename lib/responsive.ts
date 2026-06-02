import { Platform, useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  tablet: 700,
  desktop: 1100,
  large: 1500,
  huge: 1900,
} as const;

export type Responsive = {
  width: number;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  columns: number;
};

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web') {
    // Detect tablets by shortest side (Android sw600dp / iPad convention),
    // so a phone in landscape doesn't accidentally trigger the sidebar.
    const isTablet = Math.min(width, height) >= 600;
    return {
      width,
      isPhone: !isTablet,
      isTablet,
      isDesktop: false,
      columns: isTablet ? 3 : 2,
    };
  }
  const isHuge = width >= BREAKPOINTS.huge;
  const isLarge = !isHuge && width >= BREAKPOINTS.large;
  const isDesktop = !isLarge && !isHuge && width >= BREAKPOINTS.desktop;
  const isTablet = !isDesktop && !isLarge && !isHuge && width >= BREAKPOINTS.tablet;
  const isPhone = !isDesktop && !isTablet && !isLarge && !isHuge;
  const columns = isHuge ? 6 : isLarge ? 5 : isDesktop ? 4 : isTablet ? 3 : 2;
  return {
    width,
    isPhone,
    isTablet,
    isDesktop: isDesktop || isLarge || isHuge,
    columns,
  };
}

export const AUTH_SPLIT_MIN_WIDTH = 880;

export function useAuthSplit(): boolean {
  const { width, isPhone } = useResponsive();
  return !isPhone && Platform.OS === 'web' && width >= AUTH_SPLIT_MIN_WIDTH;
}
