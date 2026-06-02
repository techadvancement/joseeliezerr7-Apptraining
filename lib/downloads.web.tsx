import { createContext, useContext, type ReactNode } from 'react';
import type { Video } from './supabase';

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

const IDLE: DownloadStatus = { state: 'idle' };

function pickTitle(video: Video): string {
  const t = video.title_en || video.title_es || `video-${video.id}`;
  // Strip filesystem-unfriendly characters and trim length.
  return t.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 120) || `video-${video.id}`;
}

function extFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.([a-zA-Z0-9]{2,5})$/);
    return m ? m[1].toLowerCase() : 'mp4';
  } catch {
    return 'mp4';
  }
}

async function browserDownload(video: Video): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('not_supported');
  }
  const filename = `${pickTitle(video)}.${extFromUrl(video.video_url)}`;
  // For Supabase Storage URLs, the `?download=<filename>` query param tells
  // the server to send Content-Disposition: attachment, so the browser
  // downloads the file directly (streaming, with its native progress bar)
  // instead of opening it in a new tab. For other URLs the param is
  // harmless and the `download` attribute on the anchor is used as a
  // best-effort hint.
  let href = video.video_url;
  if (/\/storage\/v1\/object\/public\//.test(href)) {
    href += (href.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(filename);
  }
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const WEB: DownloadsContextValue = {
  // Browser file downloads are supported. Persistent offline state isn't —
  // each click triggers a fresh save to the user's Downloads folder, and
  // we don't track which videos were saved (the file lives in the OS, not
  // in app storage).
  supported: true,
  status: () => IDLE,
  isDownloaded: () => false,
  getLocalUri: () => null,
  list: () => [],
  totalBytes: () => 0,
  download: browserDownload,
  remove: async () => {},
};

const Ctx = createContext<DownloadsContextValue>(WEB);

export function DownloadsProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={WEB}>{children}</Ctx.Provider>;
}

export function useDownloads() {
  return useContext(Ctx);
}
