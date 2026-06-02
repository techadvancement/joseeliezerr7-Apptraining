import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedStorage } from '@supabase/supabase-js';

// AsyncStorage instead of SecureStore: Supabase JWTs + session metadata can
// exceed iOS Keychain's 2048-byte-per-item limit, which silently truncates
// the session blob and makes auth "vanish" on reload. AsyncStorage is the
// pattern recommended in supabase-js's React Native docs.
export const storage: SupportedStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
