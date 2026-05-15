import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const SecureStoreAdapter: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const storage: SupportedStorage =
  Platform.OS === 'web' ? AsyncStorage : SecureStoreAdapter;

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const envUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
const envKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '';

export const SUPABASE_CONFIGURED = Boolean(envUrl && envKey);

if (!SUPABASE_CONFIGURED) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Running with mock data — set them in .env to enable real auth and storage.'
  );
}

const supabaseUrl = SUPABASE_CONFIGURED ? envUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = SUPABASE_CONFIGURED ? envKey : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export type VideoCategory = {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
  thumbnail_url: string | null;
  order_index: number;
};

export type Chapter = {
  start_seconds: number;
  title_en: string;
  title_es: string;
};

export type Video = {
  id: string;
  category_id: string;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  thumbnail_url: string;
  video_url: string;
  duration_seconds: number;
  size_bytes: number | null;
  resolution: string | null;
  instructor: string | null;
  chapters: Chapter[] | null;
  series_id: string | null;
  series_position: number | null;
  created_at: string;
};

export type Series = {
  id: string;
  slug: string;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  order_index: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
  // Optional computed fields (when joined)
  video_count?: number;
  total_duration_seconds?: number;
};

export type Manual = {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  thumbnail_url: string;
  pdf_url_en: string | null;
  pdf_url_es: string | null;
  page_count: number | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  country: string;
  phone: string | null;
  avatar_url: string | null;
  role?: 'user' | 'admin' | null;
};
