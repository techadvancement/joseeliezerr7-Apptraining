import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COUNTRIES, findCountry, normalize, type Country } from '@/lib/countries';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Props = {
  value?: string;
  onChange: (country: Country) => void;
  label?: string;
  error?: string;
};

export function CountryPicker({ value, onChange, label, error }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'es';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => (value ? findCountry(value) ?? null : null), [value]);

  // Sorted by the name shown in the current language.
  const sorted = useMemo(() => {
    const key = (c: Country) => (lang === 'es' ? c.name_es : c.name_en);
    return [...COUNTRIES].sort((a, b) => key(a).localeCompare(key(b), lang));
  }, [lang]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.code.toLowerCase() === q ||
        normalize(c.name_en).includes(q) ||
        normalize(c.name_es).includes(q)
    );
  }, [query, sorted]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, !!error && styles.fieldError]}
      >
        {selected ? (
          <View style={styles.row}>
            <Text style={styles.flag}>{selected.flag}</Text>
            <Text style={styles.value}>
              {lang === 'es' ? selected.name_es : selected.name_en}
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>
            {t('auth.country')}
          </Text>
        )}
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('auth.country')}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={26} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.searchField}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                placeholder={t('common.search')}
                placeholderTextColor={colors.textSubtle}
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    setQuery('');
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.flagLg}>{item.flag}</Text>
                  <Text style={styles.itemText}>
                    {lang === 'es' ? item.name_es : item.name_en}
                  </Text>
                  {selected?.code === item.code ? (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  fieldError: { borderColor: colors.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flag: { fontSize: 22 },
  value: { color: colors.text, fontSize: 16 },
  placeholder: { color: colors.textSubtle, fontSize: 16 },
  errorText: { color: colors.danger, ...typography.caption },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    paddingTop: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sheetTitle: { ...typography.h3, color: colors.text },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { backgroundColor: colors.surface },
  flagLg: { fontSize: 24 },
  itemText: { flex: 1, color: colors.text, fontSize: 16 },
});
