import Constants from 'expo-constants';
import { supabase, type Manual, type Series, type Video, type VideoCategory } from './supabase';
import { MOCK_CATEGORIES, MOCK_MANUALS, MOCK_VIDEOS } from './mockData';
import { cached } from './cache';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const hasSupabase = Boolean(
  (process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl) &&
    (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey)
);

export const USING_MOCKS = !hasSupabase;

export function fetchCategories(): Promise<VideoCategory[]> {
  return cached('categories:list', async () => {
    if (!hasSupabase) return MOCK_CATEGORIES;
    const { data, error } = await supabase
      .from('video_categories')
      .select('*')
      .order('order_index', { ascending: true });
    if (error) throw error;
    return (data ?? []) as VideoCategory[];
  });
}

export function fetchVideos(
  categorySlug?: string,
  opts: { limit?: number } = {}
): Promise<Video[]> {
  const key = `videos:list:${categorySlug ?? '*'}:${opts.limit ?? 'all'}`;
  return cached(key, async () => {
    if (!hasSupabase) {
      const base = !categorySlug
        ? MOCK_VIDEOS
        : MOCK_VIDEOS.filter(
            (v) => v.category_id === MOCK_CATEGORIES.find((c) => c.slug === categorySlug)?.id
          );
      return opts.limit ? base.slice(0, opts.limit) : base;
    }
    let q = supabase
      .from('videos')
      .select('*, category:video_categories!inner(slug)')
      .order('created_at', { ascending: !!categorySlug });
    if (categorySlug) q = q.eq('category.slug', categorySlug);
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Video[];
  });
}

export function fetchVideoCategoryIds(): Promise<{ category_id: string }[]> {
  return cached('videos:categoryIds', async () => {
    if (!hasSupabase) {
      return MOCK_VIDEOS.map((v) => ({ category_id: v.category_id }));
    }
    const { data, error } = await supabase.from('videos').select('category_id');
    if (error) throw error;
    return (data ?? []) as { category_id: string }[];
  });
}

export function fetchVideo(id: string): Promise<Video | null> {
  return cached(`videos:one:${id}`, async () => {
    if (!hasSupabase) return MOCK_VIDEOS.find((v) => v.id === id) ?? null;
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Video | null;
  });
}

export function fetchRelatedVideos(
  categoryId: string,
  excludeId: string,
  limit = 6
): Promise<Video[]> {
  return cached(`videos:related:${categoryId}:${excludeId}:${limit}`, async () => {
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
  });
}

export function fetchCategory(id: string): Promise<VideoCategory | null> {
  return cached(`categories:one:${id}`, async () => {
    if (!hasSupabase) return MOCK_CATEGORIES.find((c) => c.id === id) ?? null;
    const { data, error } = await supabase
      .from('video_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as VideoCategory | null;
  });
}

export function fetchManuals(
  lang?: 'en' | 'es',
  opts: { limit?: number } = {}
): Promise<Manual[]> {
  const key = `manuals:list:${lang ?? '*'}:${opts.limit ?? 'all'}`;
  return cached(key, async () => {
    if (!hasSupabase) {
      const base = MOCK_MANUALS.filter((m) =>
        !lang ? true : lang === 'en' ? !!m.pdf_url_en : !!m.pdf_url_es
      );
      return opts.limit ? base.slice(0, opts.limit) : base;
    }
    let q = supabase
      .from('manuals')
      .select('*')
      .order('created_at', { ascending: false });
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw error;
    const all = (data ?? []) as Manual[];
    if (!lang) return all;
    return all.filter((m) => (lang === 'en' ? !!m.pdf_url_en : !!m.pdf_url_es));
  });
}

export function fetchManual(id: string): Promise<Manual | null> {
  return cached(`manuals:one:${id}`, async () => {
    if (!hasSupabase) return MOCK_MANUALS.find((m) => m.id === id) ?? null;
    const { data, error } = await supabase
      .from('manuals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Manual | null;
  });
}

// =========================
// Series
// =========================
export function fetchSeries(
  opts: { featuredOnly?: boolean; limit?: number } = {}
): Promise<Series[]> {
  const key = `series:list:${opts.featuredOnly ? 'featured' : 'all'}:${opts.limit ?? 'all'}`;
  return cached(key, async () => {
    if (!hasSupabase) return [];
    let q = supabase
      .from('series')
      .select('*, videos:videos(duration_seconds)')
      .order('order_index', { ascending: true });
    if (opts.featuredOnly) q = q.eq('featured', true);
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((s: any) => ({
      ...s,
      video_count: s.videos?.length ?? 0,
      total_duration_seconds:
        (s.videos ?? []).reduce((sum: number, v: any) => sum + (v.duration_seconds ?? 0), 0),
      videos: undefined,
    })) as Series[];
  });
}

export function fetchSeriesById(id: string): Promise<Series | null> {
  return cached(`series:one:${id}`, async () => {
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
  });
}

export function fetchSeriesVideos(seriesId: string): Promise<Video[]> {
  return cached(`series:videos:${seriesId}`, async () => {
    if (!hasSupabase) return [];
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('series_id', seriesId)
      .order('series_position', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Video[];
  });
}
