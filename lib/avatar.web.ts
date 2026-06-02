import { supabase } from './supabase';

export type PickedImage = {
  uri: string;
  mimeType: string;
  fileName: string;
  width: number;
  height: number;
};

export function pickAvatarImage(): Promise<PickedImage | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const uri = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        resolve({
          uri,
          mimeType: file.type || 'image/jpeg',
          fileName: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = uri;
    };
    input.click();
  });
}

export async function uploadAvatar(
  userId: string,
  picked: PickedImage
): Promise<string> {
  const ext = (picked.fileName.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const res = await fetch(picked.uri);
  const body = await res.blob();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, body, {
      contentType: picked.mimeType,
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
