import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export type PickedImage = {
  uri: string;
  mimeType: string;
  fileName: string;
  width: number;
  height: number;
};

export async function pickAvatarImage(): Promise<PickedImage | null> {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access photos was denied');
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    mimeType: a.mimeType ?? 'image/jpeg',
    fileName: a.fileName ?? `avatar-${Date.now()}.jpg`,
    width: a.width,
    height: a.height,
  };
}

export async function uploadAvatar(
  userId: string,
  picked: PickedImage
): Promise<string> {
  const ext = (picked.fileName.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  let body: Blob | ArrayBuffer;
  if (Platform.OS === 'web') {
    const res = await fetch(picked.uri);
    body = await res.blob();
  } else {
    // fetch(file://).arrayBuffer() returns an empty buffer on React Native.
    // Read via expo-file-system and decode base64 → Uint8Array instead.
    const base64 = await FileSystem.readAsStringAsync(picked.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    body = decodeBase64ToArrayBuffer(base64);
  }

  const { error } = await supabase.storage.from('avatars').upload(path, body, {
    contentType: picked.mimeType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = global.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
