import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { getNotes, saveNotes } from '@/lib/notes';
import { CenterModal } from '@/components/CenterModal';
import { useToast } from '@/components/Toast';
import { haptics } from '@/lib/haptics';
import { formatDuration } from '@/lib/format';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';

type Entry = {
  id: string;
  position: number | null;
  text: string;
  created_at: string;
};

type Stored = { entries: Entry[] };

function parseStored(raw: string): Entry[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.entries)) {
      return parsed.entries.filter(
        (e: any) =>
          e &&
          typeof e.text === 'string' &&
          typeof e.id === 'string' &&
          (e.position === null || typeof e.position === 'number'),
      ) as Entry[];
    }
  } catch {
    // legacy free-text: convert to one untimed entry
  }
  return [
    {
      id: 'legacy-' + Date.now(),
      position: null,
      text: raw,
      created_at: new Date().toISOString(),
    },
  ];
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

type Props = {
  videoId: string;
  currentSeconds?: number;
  onSeek?: (seconds: number) => void;
};

export function VideoNotes({ videoId, currentSeconds = 0, onSeek }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editing, setEditing] = useState<Entry | null>(null);
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    getNotes(user.id, videoId)
      .then((raw) => setEntries(parseStored(raw)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user, videoId]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (a.position == null && b.position == null) {
        return a.created_at.localeCompare(b.created_at);
      }
      if (a.position == null) return 1;
      if (b.position == null) return -1;
      return a.position - b.position;
    });
  }, [entries]);

  async function persist(next: Entry[]) {
    setEntries(next);
    if (!user) return;
    setStatus('saving');
    try {
      const payload: Stored = { entries: next };
      await saveNotes(user.id, videoId, JSON.stringify(payload));
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('idle');
    }
  }

  function openAdd() {
    setEditing({
      id: makeId(),
      position: Math.max(0, Math.floor(currentSeconds)),
      text: '',
      created_at: new Date().toISOString(),
    });
    setDraftText('');
  }

  function openEdit(e: Entry) {
    setEditing(e);
    setDraftText(e.text);
  }

  async function commitDraft() {
    if (!editing) return;
    const text = draftText.trim();
    if (!text) {
      // Empty text → close without saving
      setEditing(null);
      return;
    }
    const exists = entries.some((e) => e.id === editing.id);
    const next: Entry[] = exists
      ? entries.map((e) => (e.id === editing.id ? { ...editing, text } : e))
      : [...entries, { ...editing, text }];
    await persist(next);
    setEditing(null);
  }

  function confirmDelete() {
    if (!editing) return;
    const doDelete = async () => {
      const next = entries.filter((e) => e.id !== editing.id);
      await persist(next);
      setEditing(null);
    };
    const msg = t('videos.deleteNoteConfirm');
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(msg)) doDelete();
      return;
    }
    Alert.alert(t('videos.deleteNote'), msg, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.ok'), style: 'destructive', onPress: doDelete },
    ]);
  }

  function jumpTo(seconds: number) {
    haptics.selection();
    onSeek?.(seconds);
  }

  if (!loaded) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{t('videos.notesTitle')}</Text>
          {entries.length > 0 ? (
            <Text style={styles.count}>{entries.length}</Text>
          ) : null}
        </View>
        {status === 'saving' ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Text style={styles.status}>{t('videos.notesSaving')}</Text>
          </View>
        ) : status === 'saved' ? (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[styles.status, { color: colors.success }]}>
              {t('videos.notesSaved')}
            </Text>
          </View>
        ) : null}
      </View>

      {entries.length === 0 ? (
        <Text style={styles.empty}>{t('videos.notesEmpty')}</Text>
      ) : (
        <View style={styles.list}>
          {sortedEntries.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => openEdit(e)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <Pressable
                onPress={(ev) => {
                  ev.stopPropagation?.();
                  if (e.position != null) jumpTo(e.position);
                }}
                disabled={e.position == null || !onSeek}
                style={[
                  styles.stamp,
                  e.position == null && styles.stampDisabled,
                ]}
              >
                <Ionicons
                  name={e.position != null ? 'play' : 'pricetag-outline'}
                  size={11}
                  color={e.position != null ? '#fff' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.stampText,
                    e.position == null && { color: colors.textMuted },
                  ]}
                >
                  {e.position != null
                    ? formatDuration(e.position)
                    : t('videos.noTimestamp')}
                </Text>
              </Pressable>
              <Text numberOfLines={3} style={styles.entryText}>
                {e.text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => {
          haptics.light();
          openAdd();
        }}
        style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.88 }]}
      >
        <Ionicons name="add-circle" size={18} color={colors.primary} />
        <Text style={styles.addText}>{t('videos.addNote')}</Text>
        {currentSeconds > 0 ? (
          <Text style={styles.addStamp}>
            · {formatDuration(Math.floor(currentSeconds))}
          </Text>
        ) : null}
      </Pressable>

      <CenterModal
        visible={editing != null}
        onClose={() => setEditing(null)}
        title={
          editing && entries.some((e) => e.id === editing.id)
            ? t('videos.editNote')
            : t('videos.addNote')
        }
      >
        {editing ? (
          <View style={{ gap: spacing.md }}>
            <View style={styles.sheetStampRow}>
              {editing.position != null ? (
                <View style={styles.sheetStamp}>
                  <Ionicons name="time-outline" size={13} color={colors.primary} />
                  <Text style={styles.sheetStampText}>
                    {formatDuration(editing.position)}
                  </Text>
                </View>
              ) : (
                <View style={styles.sheetStamp}>
                  <Ionicons name="pricetag-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.sheetStampText, { color: colors.textMuted }]}>
                    {t('videos.noTimestamp')}
                  </Text>
                </View>
              )}
            </View>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder={t('videos.notesPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              multiline
              autoFocus
              textAlignVertical="top"
              style={styles.sheetInput}
            />
            <View style={styles.sheetActions}>
              {entries.some((e) => e.id === editing.id) ? (
                <Pressable
                  onPress={() => {
                    haptics.warning?.();
                    confirmDelete();
                  }}
                  style={({ pressed }) => [
                    styles.sheetBtn,
                    styles.sheetBtnDanger,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={[styles.sheetBtnText, { color: colors.danger }]}>
                    {t('videos.deleteNote')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  haptics.light();
                  commitDraft().catch(() => toast.error(t('common.couldNotUpdate')));
                }}
                style={({ pressed }) => [
                  styles.sheetBtn,
                  styles.sheetBtnPrimary,
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={[styles.sheetBtnText, { color: '#fff' }]}>
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </CenterModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  title: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  count: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { ...typography.caption, color: colors.textMuted },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: spacing.sm,
  },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    minWidth: 64,
    justifyContent: 'center',
  },
  stampDisabled: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stampText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  entryText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  addText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  addStamp: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.85,
  },
  sheetStampRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  sheetStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primary + '22',
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  sheetStampText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sheetInput: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  sheetBtnPrimary: { backgroundColor: colors.primary },
  sheetBtnDanger: {
    backgroundColor: colors.danger + '15',
    borderWidth: 1,
    borderColor: colors.danger + '55',
  },
  sheetBtnText: { fontWeight: '800', fontSize: 14 },
});
