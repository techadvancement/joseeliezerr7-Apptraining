import Constants from 'expo-constants';
import { supabase, type Manual, type Series, type Video, type VideoCategory } from './supabase';
import { MOCK_CATEGORIES, MOCK_MANUALS, MOCK_VIDEOS } from './mockData';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const hasSupabase = Boolean(
  (process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl) &&
    (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey)
);

export const USING_MOCKS = !hasSupabase;

export async function fetchCategories(): Promise<VideoCategory[]> {
  if (!hasSupabase) return MOCK_CATEGORIES;
  const { data, error } = await supabase
    .from('video_categories')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VideoCategory[];
}

export async function fetchVideos(categorySlug?: string): Promise<Video[]> {
  if (!hasSupabase) {
    if (!categorySlug) return MOCK_VIDEOS;
    const cat = MOCK_CATEGORIES.find((c) => c.slug === categorySlug);
    return MOCK_VIDEOS.filter((v) => v.category_id === cat?.id);
  }
  let q = supabase
    .from('videos')
    .select('*, category:video_categories!inner(slug)')
    .order('created_at', { ascending: false });
  if (categorySlug) q = q.eq('category.slug', categorySlug);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Video[];
}

export async function fetchVideo(id: string): Promise<Video | null> {
  if (!hasSupabase) return MOCK_VIDEOS.find((v) => v.id === id) ?? null;
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Video | null;
}

export async function fetchRelatedVideos(
  categoryId: string,
  excludeId: string,
  limit = 6
): Promise<Video[]> {
  if (!hasSupabase) {
    return MOCK_VIDEOS.filter(
      (v) => v.category_id === categoryId && v.id !== excludeId
    ).slice(0, limit);
  }
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('category_id', categoryId)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Video[];
}

export async function fetchCategory(id: string): Promise<VideoCategory | null> {
  if (!hasSupabase) return MOCK_CATEGORIES.find((c) => c.id === id) ?? null;
  const { data, error } = await supabase
    .from('video_categories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as VideoCategory | null;
}

export async function fetchManuals(lang?: 'en' | 'es'): Promise<Manual[]> {
  if (!hasSupabase) {
    return MOCK_MANUALS.filter((m) =>
      !lang ? true : lang === 'en' ? !!m.pdf_url_en : !!m.pdf_url_es
    );
  }
  const { data, error } = await supabase
    .from('manuals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const all = (data ?? []) as Manual[];
  if (!lang) return all;
  return all.filter((m) => (lang === 'en' ? !!m.pdf_url_en : !!m.pdf_url_es));
}

export async function fetchManual(id: string): Promise<Manual | null> {
  if (!hasSupabase) return MOCK_MANUALS.find((m) => m.id === id) ?? null;
  const { data, error } = await supabase
    .from('manuals')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Manual | null;
}

// =========================
// Series
// =========================
export async function fetchSeries(opts: { featuredOnly?: boolean } = {}): Promise<Series[]> {
  if (!hasSupabase) return [];
  let q = supabase
    .from('series')
    .select('*, videos:videos(duration_seconds)')
    .order('order_index', { ascending: true });
  if (opts.featuredOnly) q = q.eq('featured', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((s: any) => ({
    ...s,
    video_count: s.videos?.length ?? 0,
    total_duration_seconds:
      (s.videos ?? []).reduce((sum: number, v: any) => sum + (v.duration_seconds ?? 0), 0),
    videos: undefined,
  })) as Series[];
}

export async function fetchSeriesById(id: string): Promise<Series | null> {
  if (!hasSupabase) return null;
  const { data, error } = await supabase
    .from('series')
    .select('*, videos:videos(duration_seconds)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const s: any = data;
  return {
    ...s,
    video_count: s.videos?.length ?? 0,
    total_duration_seconds:
      (s.videos ?? []).reduce((sum: number, v: any) => sum + (v.duration_seconds ?? 0), 0),
    videos: undefined,
  } as Series;
}

export async function fetchSeriesVideos(seriesId: string): Promise<Video[]> {
  if (!hasSupabase) return [];
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('series_id', seriesId)
    .order('series_position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Video[];
}
