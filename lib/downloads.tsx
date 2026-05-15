import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Video } from './supabase';

const META_KEY = 'app.downloads.v1';
const SUPPORTED = Platform.OS !== 'web';
const DIR = SUPPORTED ? `${FileSystem.documentDirectory}videos/` : '';

export type DownloadedItem = {
  video: Video;
  localUri: string;
  sizeBytes: number;
  downloadedAt: string;
};

export type DownloadStatus =
  | { state: 'idle' }
  | { state: 'downloading'; progress: number }
  | { state: 'done'; item: DownloadedItem }
  | { state: 'error'; message: string };

type DownloadsContextValue = {
  supported: boolean;
  status: (videoId: string) => DownloadStatus;
  isDownloaded: (videoId: string) => boolean;
  getLocalUri: (videoId: string) => string | null;
  list: () => DownloadedItem[];
  totalBytes: () => number;
  download: (video: Video) => Promise<void>;
  remove: (videoId: string) => Promise<void>;
};

const Ctx = createContext<DownloadsContextValue | null>(null);

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

async function ensureDir() {
  if (!SUPPORTED) return;
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  }
}

async function readMeta(): Promise<Record<string, DownloadedItem>> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as Record<string, DownloadedItem>) : {};
  } catch {
    return {};
  }
}

async function writeMeta(map: Record<string, DownloadedItem>) {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(map));
}

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Record<string, DownloadStatus>>({});
  const activeRef = useRef<Record<string, FileSystem.DownloadResumable>>({});

  useEffect(() => {
    if (!SUPPORTED) return;
    (async () => {
      await ensureDir();
      const meta = await readMeta();
      const next: Record<string, DownloadStatus> = {};
      const cleaned: Record<string, DownloadedItem> = {};
      for (const [id, item] of Object.entries(meta)) {
        const info = await FileSystem.getInfoAsync(item.localUri).catch(() => null);
        if (info && info.exists) {
          next[id] = { state: 'done', item };
          cleaned[id] = item;
        }
      }
      setById(next);
      if (Object.keys(cleaned).length !== Object.keys(meta).length) {
        await writeMeta(cleaned);
      }
    })();
  }, []);

  const status = useCallback(
    (videoId: string): DownloadStatus => byId[videoId] ?? { state: 'idle' },
    [byId]
  );

  const isDownloaded = useCallback(
    (videoId: string) => byId[videoId]?.state === 'done',
    [byId]
  );

  const getLocalUri = useCallback(
    (videoId: string) => {
      const s = byId[videoId];
      return s && s.state === 'done' ? s.item.localUri : null;
    },
    [byId]
  );

  const list = useCallback(
    () =>
      Object.values(byId)
        .filter((s): s is Extract<DownloadStatus, { state: 'done' }> => s.state === 'done')
        .map((s) => s.item)
        .sort((a, b) => (a.downloadedAt < b.downloadedAt ? 1 : -1)),
    [byId]
  );

  const totalBytes = useCallback(
    () => list().reduce((sum, item) => sum + (item.sizeBytes || 0), 0),
    [list]
  );

  const download = useCallback(async (video: Video) => {
    if (!SUPPORTED) throw new Error('not_supported');
    if (!video.video_url) throw new Error('no_url');
    await ensureDir();
    const dest = `${DIR}${safeId(video.id)}.mp4`;

    setById((m) => ({ ...m, [video.id]: { state: 'downloading', progress: 0 } }));

    const handle = FileSystem.createDownloadResumable(
      video.video_url,
      dest,
      {},
      (p) => {
        const total = p.totalBytesExpectedToWrite || 0;
        const written = p.totalBytesWritten || 0;
        const progress = total > 0 ? Math.min(1, written / total) : 0;
        setById((m) => ({
          ...m,
          [video.id]: { state: 'downloading', progress },
        }));
      }
    );
    activeRef.current[video.id] = handle;

    try {
      const result = await handle.downloadAsync();
      if (!result) throw new Error('download_failed');
      const info = await FileSystem.getInfoAsync(result.uri);
      const sizeBytes = info && info.exists && 'size' in info ? (info.size as number) : 0;
      const item: DownloadedItem = {
        video,
        localUri: result.uri,
        sizeBytes,
        downloadedAt: new Date().toISOString(),
      };
      const meta = await readMeta();
      meta[video.id] = item;
      await writeMeta(meta);
      setById((m) => ({ ...m, [video.id]: { state: 'done', item } }));
    } catch (e: any) {
      setById((m) => ({
        ...m,
        [video.id]: { state: 'error', message: e?.message ?? 'error' },
      }));
      throw e;
    } finally {
      delete activeRef.current[video.id];
    }
  }, []);

  const remove = useCallback(async (videoId: string) => {
    if (!SUPPORTED) return;
    const meta = await readMeta();
    const item = meta[videoId];
    if (item) {
      await FileSystem.deleteAsync(item.localUri, { idempotent: true }).catch(() => {});
      delete meta[videoId];
      await writeMeta(meta);
    }
    setById((m) => {
      const next = { ...m };
      delete next[videoId];
      return next;
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        supported: SUPPORTED,
        status,
        isDownloaded,
        getLocalUri,
        list,
        totalBytes,
        download,
        remove,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDownloads() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDownloads must be inside DownloadsProvider');
  return v;
}
