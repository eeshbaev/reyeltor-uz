import * as FileSystem from 'expo-file-system/legacy';
import { LISTINGS_STORAGE_BUCKET, supabase } from '@/lib/supabase';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function readLocalImageBytes(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(base64);
}

export async function uploadLocalImage(
  path: string,
  localUri: string,
  contentType = 'image/jpeg',
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const bytes = await readLocalImageBytes(localUri);
    const { error } = await supabase.storage.from(LISTINGS_STORAGE_BUCKET).upload(path, bytes, {
      contentType,
      upsert: false,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return { ok: false, message };
  }
}
