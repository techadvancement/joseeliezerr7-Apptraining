import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './auth';
import { useDownloads } from './downloads';
import { saveProgress } from './progress';
import type { Video } from './supabase';

type AudioState = {
  track: Video | null;
  isPlaying: boolean;
  position: number;
  duration: number;
};

type AudioContextValue = AudioState & {
  play: (video: Video, startAt?: number) => Promise<void>;
  toggle: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
};

const Ctx = createContext<AudioContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const downloads = useDownloads();
  const elRef = useRef<HTMLAudioElement | null>(null);
  const lastSavedRef = useRef(0);
  const [state, setState] = useState<AudioState>({
    track: null,
    isPlaying: false,
    position: 0,
    duration: 0,
  });

  useEffect(() => {
    return () => {
      const el = elRef.current;
      if (el) {
        el.pause();
        el.src = '';
        elRef.current = null;
      }
    };
  }, []);

  function teardown() {
    const el = elRef.current;
    if (el) {
      el.pause();
      el.src = '';
      elRef.current = null;
    }
  }

  async function stop() {
    teardown();
    setState({ track: null, isPlaying: false, position: 0, duration: 0 });
  }

  async function play(video: Video, startAt = 0) {
    teardown();
    const uri = downloads.getLocalUri(video.id) ?? video.video_url;
    const audio = new window.Audio(uri);
    audio.preload = 'metadata';
    audio.currentTime = startAt;

    audio.addEventListener('loadedmetadata', () => {
      setState((s) => ({
        ...s,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      }));
    });
    audio.addEventListener('timeupdate', () => {
      const pos = audio.currentTime;
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      setState((s) => ({
        ...s,
        position: pos,
        duration: dur,
        isPlaying: !audio.paused,
      }));
      if (user && dur > 0) {
        const now = Date.now();
        if (now - lastSavedRef.current > 5000) {
          lastSavedRef.current = now;
          saveProgress(user.id, video.id, pos, dur).catch(() => {});
        }
      }
    });
    audio.addEventListener('play', () => {
      setState((s) => ({ ...s, isPlaying: true }));
    });
    audio.addEventListener('pause', () => {
      setState((s) => ({ ...s, isPlaying: false }));
    });
    audio.addEventListener('ended', () => {
      stop();
    });
    audio.addEventListener('error', () => {
      stop();
    });

    elRef.current = audio;
    setState({ track: video, isPlaying: false, position: startAt, duration: 0 });
    try {
      await audio.play();
    } catch {
      stop();
    }
  }

  async function toggle() {
    const el = elRef.current;
    if (!el) return;
    if (state.isPlaying) {
      el.pause();
    } else {
      try {
        await el.play();
      } catch {}
    }
  }

  async function seek(seconds: number) {
    const el = elRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, seconds);
  }

  return (
    <Ctx.Provider value={{ ...state, play, toggle, stop, seek }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAudioPlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAudioPlayer must be inside AudioPlayerProvider');
  return v;
}
