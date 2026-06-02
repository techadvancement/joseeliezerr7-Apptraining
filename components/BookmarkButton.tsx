import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import {
  isBookmarked as isBookmarkedFn,
  toggleBookmark,
  type BookmarkType,
} from '@/lib/bookmarks';
import { useToast } from '@/components/Toast';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/constants/theme';

type Props = {
  type: BookmarkType;
  id: string;
  size?: number;
};

export function BookmarkButton({ type, id, size = 22 }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    isBookmarkedFn(user.id, type, id)
      .then(setActive)
      .catch(() => {});
  }, [user, type, id]);

  async function onToggle() {
    if (!user || pending) return;
    setPending(true);
    const prev = active;
    setActive(!prev);
    haptics.selection();
    try {
      const now = await toggleBookmark(user.id, type, id);
      setActive(now);
    } catch (err: any) {
      setActive(prev);
      toast.error(err?.message ?? t('common.couldNotUpdate'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={active ? t('a11y.bookmarkRemove') : t('a11y.bookmarkAdd')}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Ionicons
        name={active ? 'bookmark' : 'bookmark-outline'}
        size={size}
        color={active ? colors.accent : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pressed: { opacity: 0.8 },
});
