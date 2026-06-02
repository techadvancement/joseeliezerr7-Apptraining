import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { usePathname, useRouter, useNavigation } from 'expo-router';
import { StackActions, useFocusEffect } from '@react-navigation/native';

// expo-router's Tabs+Stack setup loses the real "previous screen" when the
// user jumps across tabs. Going /series/abc → /videos/play/xyz pushes
// /videos/play/xyz onto the videos tab's stack on top of its base /videos
// route, so router.back() pops to /videos — not to /series/abc. And
// window.history.back() doesn't help either because expo-router intercepts
// popstate and pops its own per-tab stack. We keep our own log of recently
// visited pathnames and navigate explicitly with router.replace.
const MAX_ENTRIES = 30;
// When two pathnames arrive within this window AND the previous is an
// ancestor of the new one, treat the previous as a transient tab-switch
// URL (e.g. /videos appearing briefly before /videos/play/xyz) and replace
// it instead of stacking. Otherwise the back trail leads to the tab root,
// not to the actual prior screen.
const FAMILY_REPLACE_MS = 200;

const history: string[] = [];
let lastRecordTime = 0;

function isAncestor(parent: string, child: string): boolean {
  if (!parent || parent === child) return false;
  return child.startsWith(parent + '/');
}

function shouldRecord(path: string): boolean {
  if (!path) return false;
  if (history[history.length - 1] === path) return false;
  return true;
}

export function recordPath(path: string): void {
  if (!shouldRecord(path)) return;
  const now = Date.now();
  const last = history[history.length - 1];
  if (last && now - lastRecordTime < FAMILY_REPLACE_MS && isAncestor(last, path)) {
    history[history.length - 1] = path;
  } else {
    history.push(path);
    if (history.length > MAX_ENTRIES) history.shift();
  }
  lastRecordTime = now;
}

export function getPreviousPath(currentPath?: string): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const p = history[i];
    if (!currentPath || p !== currentPath) return p;
  }
  return null;
}

export function useNavHistoryTracker(): void {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) recordPath(pathname);
  }, [pathname]);
}

export function useSmartBack() {
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useNavigation();
  return function back(fallback: string = '/', explicit?: string) {
    // Resolve the target we want to land on
    let target: string | null = null;
    if (explicit) {
      target = explicit;
    } else {
      const prev = getPreviousPath(pathname);
      if (prev && prev !== pathname) target = prev;
    }

    if (target) {
      // We're navigating to a known target, possibly in a different tab.
      // The videos/manuals/etc Stacks remember their last screen per tab,
      // so if we just router.replace(other-tab) the videos tab's stack
      // still has [/videos, /videos/play/xyz] — re-tapping the videos tab
      // brings the player back. We need to *also* reset the videos stack
      // to its root before leaving.
      try {
        navigation.dispatch(StackActions.popToTop());
      } catch {}

      // Belt and suspenders: if the target is in a different tab, first
      // replace the current route with the current tab's root (which
      // collapses the per-tab Stack), then jump to the target on the next
      // tick so React Navigation processes the in-tab reset before the
      // cross-tab switch.
      const currentSeg = pathname?.split('/').filter(Boolean)[0];
      const targetSeg = target.split('/').filter(Boolean)[0];
      const crossTab = !!currentSeg && targetSeg !== currentSeg;
      if (crossTab && currentSeg) {
        try { router.replace(`/${currentSeg}` as any); } catch {}
        setTimeout(() => {
          try { router.replace(target as any); } catch { router.push(target as any); }
        }, 0);
        return;
      }

      try {
        router.replace(target as any);
      } catch {
        router.push(target as any);
      }
      return;
    }

    // No target known — fall back to a regular pop within the current Stack
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallback as any);
  };
}

// Wire the Android hardware/gesture back button to the screen's custom back
// handler. Without this, expo-router's per-tab Stack pops to the tab root
// instead of the actual previous screen the user came from.
export function useSystemBack(handler: () => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        ref.current();
        return true;
      });
      return () => sub.remove();
    }, [])
  );
}
