import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export async function openExternal(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
}
