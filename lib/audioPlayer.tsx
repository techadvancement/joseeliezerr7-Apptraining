import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
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
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastSavedRef = useRef(0);
  const [state, setState] = useState<AudioState>({
    track: null,
    isPlaying: false,
    position: 0,
    duration: 0,
  });

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    }).catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  async function stop() {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setState({ track: null, isPlaying: false, position: 0, duration: 0 });
  }

  async function play(video: Video, startAt = 0) {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    const uri = downloads.getLocalUri(video.id) ?? video.video_url;
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      {
        shouldPlay: true,
        positionMillis: Math.max(0, Math.floor(startAt * 1000)),
        progressUpdateIntervalMillis: 500,
      }
    );
    soundRef.current = sound;
    setState({ track: video, isPlaying: true, position: startAt, duration: 0 });

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        if (status.error) {
          console.warn('[audio] playback error', status.error);
          stop();
        }
        return;
      }
      const pos = (status.positionMillis ?? 0) / 1000;
      const dur = (status.durationMillis ?? 0) / 1000;
      setState((s) => ({
        ...s,
        position: pos,
        duration: dur,
        isPlaying: status.isPlaying,
      }));

      if (user && dur > 0) {
        const now = Date.now();
        if (now - lastSavedRef.current > 5000) {
          lastSavedRef.current = now;
          saveProgress(user.id, video.id, pos, dur).catch(() => {});
        }
      }

      if (status.didJustFinish) {
        stop();
      }
    });
  }

  async function toggle() {
    if (!soundRef.current) return;
    if (state.isPlaying) {
      await soundRef.current.pauseAsync().catch(() => {});
    } else {
      await soundRef.current.playAsync().catch(() => {});
    }
  }

  async function seek(seconds: number) {
    if (!soundRef.current) return;
    await soundRef.current
      .setPositionAsync(Math.max(0, Math.floor(seconds * 1000)))
      .catch(() => {});
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
