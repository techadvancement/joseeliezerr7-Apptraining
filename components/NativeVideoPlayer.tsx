import { forwardRef, type Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';

export { Video } from 'expo-av';

export type NativeVideoPlayerProps = {
  uri: string;
  rate: number;
  resumeAtSeconds?: number | null;
  onStatus: (status: AVPlaybackStatus) => void;
  style?: StyleProp<ViewStyle>;
};

export const NativeVideoPlayer = forwardRef<Video, NativeVideoPlayerProps>(
  function NativeVideoPlayer({ uri, rate, resumeAtSeconds, onStatus, style }, ref) {
    return (
      <Video
        ref={ref as Ref<Video>}
        source={{ uri }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        rate={rate}
        positionMillis={(resumeAtSeconds ?? 0) * 1000}
        onPlaybackStatusUpdate={onStatus}
        style={style}
      />
    );
  }
);
