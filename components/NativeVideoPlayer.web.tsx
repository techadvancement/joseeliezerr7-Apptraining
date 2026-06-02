import { forwardRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export class Video {
  setRateAsync(_rate: number, _correctPitch: boolean) {
    return Promise.resolve({} as any);
  }
  playAsync() {
    return Promise.resolve({} as any);
  }
  pauseAsync() {
    return Promise.resolve({} as any);
  }
  setPositionAsync(_millis: number) {
    return Promise.resolve({} as any);
  }
  getStatusAsync() {
    return Promise.resolve(null);
  }
}

export type NativeVideoPlayerProps = {
  uri: string;
  rate: number;
  resumeAtSeconds?: number | null;
  onStatus: (status: any) => void;
  style?: StyleProp<ViewStyle>;
};

export const NativeVideoPlayer = forwardRef<Video, NativeVideoPlayerProps>(
  function NativeVideoPlayerStub() {
    return null;
  }
);
