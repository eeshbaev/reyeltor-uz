import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type * as ImagePicker from 'expo-image-picker';

/**
 * Post-form draft (manual S-06): saved a moment after every change, restored on return,
 * cleared after publishing. Stays on this device only.
 */
const KEY = (userId: string) => `@reyeltor/post_draft_v1:${userId}`;

export interface PostDraft<TForm> {
  form: TForm;
  photos: Pick<ImagePicker.ImagePickerAsset, 'uri' | 'width' | 'height' | 'mimeType' | 'fileName'>[];
  locationQuery: string;
  pinExact: boolean;
  savedAt: number;
}

export async function savePostDraft<TForm>(userId: string, draft: Omit<PostDraft<TForm>, 'savedAt'>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY(userId), JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Best-effort: a failed draft write never blocks typing.
  }
}

/** The saved draft, with photos whose files no longer exist removed. */
export async function loadPostDraft<TForm>(userId: string): Promise<PostDraft<TForm> | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as PostDraft<TForm>;
    const photos: PostDraft<TForm>['photos'] = [];
    for (const photo of draft.photos ?? []) {
      const info = await FileSystem.getInfoAsync(photo.uri).catch(() => ({ exists: false }));
      if (info.exists) photos.push(photo);
    }
    return { ...draft, photos };
  } catch {
    return null;
  }
}

export async function clearPostDraft(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY(userId));
  } catch {
    // ignore
  }
}
