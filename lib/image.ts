const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

export type ThumbOpts = {
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
};

export function thumb(
  url: string | null | undefined,
  width: number,
  opts: ThumbOpts = {}
): string | undefined {
  if (!url) return undefined;
  if (!url.includes(OBJECT_PATH)) return url;
  const base = url.replace(OBJECT_PATH, RENDER_PATH);
  const params = new URLSearchParams();
  params.set('width', String(Math.round(width)));
  params.set('quality', String(opts.quality ?? 70));
  params.set('resize', opts.resize ?? 'cover');
  return `${base}?${params.toString()}`;
}
