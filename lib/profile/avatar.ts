import type { ImageSource } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { uploadLocalImage } from '@/lib/storage/uploadLocalImage';
import { LISTINGS_STORAGE_BUCKET, supabase } from '@/lib/supabase';

export type PickProfilePhotoResult =
  | { ok: true; asset: ImagePicker.ImagePickerAsset }
  | { ok: false; reason: 'cancelled' | 'denied' };

export type UploadProfileAvatarResult =
  | { ok: true; path: string }
  | { ok: false; stage: 'upload' | 'profile'; message: string };

/** Offline-safe demo agent portraits — same photos as before, bundled locally. */
const LOCAL_DEMO_AVATARS: Record<string, ImageSource> = {
  'demo-agent-1': require('../../assets/avatars/demo-agent-1.jpg'),
  'demo-agent-2': require('../../assets/avatars/demo-agent-2.jpg'),
  'demo-agent-3': require('../../assets/avatars/demo-agent-3.jpg'),
  'demo-agent-4': require('../../assets/avatars/demo-agent-4.jpg'),
  'demo-agent-5': require('../../assets/avatars/demo-agent-5.jpg'),
  'demo-agent-6': require('../../assets/avatars/demo-agent-6.jpg'),
};

export function resolveAvatarSource(value: string | null | undefined): ImageSource | null {
  if (!value?.trim()) return null;
  if (value.startsWith('local:')) {
    return LOCAL_DEMO_AVATARS[value.slice(6)] ?? null;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return { uri: value };
  }
  const { data } = supabase.storage.from(LISTINGS_STORAGE_BUCKET).getPublicUrl(value);
  return data.publicUrl ? { uri: data.publicUrl } : null;
}

export function resolveAvatarUrl(value: string | null | undefined): string | null {
  const source = resolveAvatarSource(value);
  if (!source || typeof source === 'number') return null;
  if (typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
    return source.uri;
  }
  return null;
}

export async function pickProfilePhotoFromLibrary(): Promise<PickProfilePhotoResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return { ok: false, reason: 'cancelled' };
  return { ok: true, asset: result.assets[0] };
}

export async function uploadProfileAvatar(
  userId: string,
  asset: ImagePicker.ImagePickerAsset,
  previousPath?: string | null,
): Promise<UploadProfileAvatarResult> {
  const extension = asset.mimeType?.includes('png') ? 'png' : 'jpg';
  const contentType = asset.mimeType ?? (extension === 'png' ? 'image/png' : 'image/jpeg');
  const path = `avatars/${userId}/${Date.now()}.${extension}`;

  const upload = await uploadLocalImage(path, asset.uri, contentType);
  if (!upload.ok) {
    console.warn('Avatar upload failed:', upload.message);
    return { ok: false, stage: 'upload', message: upload.message };
  }

  const { error: updateError } = await supabase.from('users').update({ avatar_url: path }).eq('id', userId);
  if (updateError) {
    console.warn('Avatar profile update failed:', updateError.message);
    await supabase.storage.from(LISTINGS_STORAGE_BUCKET).remove([path]);
    return { ok: false, stage: 'profile', message: updateError.message };
  }

  if (previousPath && !previousPath.startsWith('http') && previousPath !== path) {
    await supabase.storage.from(LISTINGS_STORAGE_BUCKET).remove([previousPath]);
  }

  return { ok: true, path };
}

export async function removeProfileAvatar(userId: string, currentPath?: string | null): Promise<boolean> {
  const { error } = await supabase.from('users').update({ avatar_url: null }).eq('id', userId);
  if (error) {
    console.warn('Avatar remove failed:', error.message);
    return false;
  }

  if (currentPath && !currentPath.startsWith('http')) {
    await supabase.storage.from(LISTINGS_STORAGE_BUCKET).remove([currentPath]);
  }

  return true;
}
