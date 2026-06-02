import { Platform } from 'react-native';
import WebView from 'react-native-webview';

export function PdfViewer({ url }: { url: string }) {
  const source =
    Platform.OS === 'android'
      ? { uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}` }
      : { uri: url };
  return (
    <WebView
      source={source}
      style={{ flex: 1, backgroundColor: '#fff' }}
      startInLoadingState
    />
  );
}
