// Admin helpers — solo deben ser llamados por usuarios con role='admin'.
// La seguridad real vive en las políticas RLS de Supabase (defense-in-depth).

import { supabase, type Manual, type Video, type VideoCategory } from './supabase';

const PUBLIC_STORAGE_BASE = (() => {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return base ? `${base.replace(/\/$/, '')}/storage/v1/object/public` : '';
})();

export function publicUrl(bucket: string, path: string): string {
  return `${PUBLIC_STORAGE_BASE}/${bucket}/${path.replace(/^\//, '')}`;
}

export async function uploadToBucket(
  bucket: string,
  pathInBucket: string,
  file: Blob | File
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(pathInBucket, file, {
      upsert: true,
      contentType: (file as File).type || undefined,
    });
  if (error) throw error;
  return publicUrl(bucket, pathInBucket);
}

export async function deleteFromBucket(bucket: string, pathInBucket: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([pathInBucket]);
  if (error) throw error;
}

// Slugify utility for safe filenames
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

// =========================
// Categories
// =========================
export type CategoryInput = {
  slug: string;
  name_en: string;
  name_es: string;
  order_index: number;
  thumbnail_url?: string | null;
};

export async function listAllCategories(): Promise<VideoCategory[]> {
  const { data, error } = await supabase
    .from('video_categories')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VideoCategory[];
}

export async function createCategory(input: CategoryInput): Promise<VideoCategory> {
  const { data, error } = await supabase
    .from('video_categories')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as VideoCategory;
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<void> {
  const { error } = await supabase.from('video_categories').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('video_categories').delete().eq('id', id);
  if (error) throw error;
}

// =========================
// Videos
// =========================
export type VideoInput = {
  category_id: string;
  title_en: string;
  title_es: string;
  description_en?: string | null;
  description_es?: string | null;
  thumbnail_url: string;
  video_url: string;
  duration_seconds: number;
  size_bytes?: number | null;
  resolution?: string | null;
  instructor?: string | null;
};

export async function listAllVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Video[];
}

export async function createVideo(input: VideoInput): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Video;
}

export async function updateVideo(id: string, patch: Partial<VideoInput>): Promise<void> {
  const { error } = await supabase.from('videos').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw error;
}

// =========================
// Series
// =========================
import type { Series } from './supabase';

export type SeriesInput = {
  slug: string;
  title_en: string;
  title_es: string;
  description_en?: string | null;
  description_es?: string | null;
  thumbnail_url?: string | null;
  category_id?: string | null;
  order_index: number;
  featured: boolean;
};

export async function listAllSeries(): Promise<Series[]> {
  const { data, error } = await supabase
    .from('series')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Series[];
}

export async function createSeries(input: SeriesInput): Promise<Series> {
  const { data, error } = await supabase.from('series').insert(input).select('*').single();
  if (error) throw error;
  return data as Series;
}

export async function updateSeries(id: string, patch: Partial<SeriesInput>): Promise<void> {
  const { error } = await supabase.from('series').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteSeries(id: string): Promise<void> {
  const { error } = await supabase.from('series').delete().eq('id', id);
  if (error) throw error;
}

// =========================
// Manuals
// =========================
export type ManualInput = {
  title_en: string;
  title_es: string;
  description_en?: string | null;
  description_es?: string | null;
  thumbnail_url: string;
  pdf_url_en?: string | null;
  pdf_url_es?: string | null;
  page_count?: number | null;
};

export async function listAllManuals(): Promise<Manual[]> {
  const { data, error } = await supabase
    .from('manuals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Manual[];
}

export async function createManual(input: ManualInput): Promise<Manual> {
  const { data, error } = await supabase
    .from('manuals')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Manual;
}

export async function updateManual(id: string, patch: Partial<ManualInput>): Promise<void> {
  const { error } = await supabase.from('manuals').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteManual(id: string): Promise<void> {
  const { error } = await supabase.from('manuals').delete().eq('id', id);
  if (error) throw error;
}

// =========================
// Users
// =========================
export type AdminUser = {
  id: string;
  email: string;
  signed_up_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  full_name: string;
  country: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
};

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

export async function setUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) throw error;
}

// =========================
// Stats
// =========================
export type AdminStats = {
  videos: number;
  manuals: number;
  categories: number;
  users: number;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  const [v, m, c, u] = await Promise.all([
    supabase.from('videos').select('*', { count: 'exact', head: true }),
    supabase.from('manuals').select('*', { count: 'exact', head: true }),
    supabase.from('video_categories').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ]);
  return {
    videos: v.count ?? 0,
    manuals: m.count ?? 0,
    categories: c.count ?? 0,
    users: u.count ?? 0,
  };
}
