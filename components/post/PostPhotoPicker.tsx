import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

const MAX_PHOTOS = 10;

interface PostPhotoPickerProps {
  photos: ImagePicker.ImagePickerAsset[];
  onChange: (photos: ImagePicker.ImagePickerAsset[]) => void;
}

export function PostPhotoPicker({ photos, onChange }: PostPhotoPickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      onChange([...photos, ...result.assets].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (uri: string) => {
    onChange(photos.filter((photo) => photo.uri !== uri));
  };

  return (
    <View>
      <Pressable
        onPress={pickPhotos}
        disabled={photos.length >= MAX_PHOTOS}
        style={[
          styles.dropzone,
          {
            borderColor: theme.colors.borderStrong,
            backgroundColor: theme.colors.surface,
            opacity: photos.length >= MAX_PHOTOS ? 0.5 : 1,
          },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: theme.colors.accentSurface }]}>
          <Ionicons name="images-outline" size={24} color={theme.colors.accent} />
        </View>
        <AppText variant="label" style={styles.dropTitle}>
          {t('listing.addPhotos')}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.dropHint}>
          {t('listing.photosHint', { count: MAX_PHOTOS - photos.length })}
        </AppText>
      </Pressable>

      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {photos.map((photo, index) => (
            <View key={photo.uri} style={styles.thumbWrap}>
              <Image source={{ uri: photo.uri }} style={styles.thumb} />
              {index === 0 ? (
                <View style={[styles.coverBadge, { backgroundColor: theme.colors.accent }]}>
                  <AppText variant="caption" color="onAccent" style={styles.coverText}>
                    {t('listing.coverPhoto')}
                  </AppText>
                </View>
              ) : null}
              <Pressable
                onPress={() => removePhoto(photo.uri)}
                style={[styles.removeBtn, { backgroundColor: theme.colors.primary }]}
                hitSlop={8}
              >
                <Ionicons name="close" size={14} color={theme.colors.background} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: {
    textAlign: 'center',
  },
  dropHint: {
    textAlign: 'center',
  },
  thumbRow: {
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingRight: spacing.sm,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
  },
  coverBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  coverText: {
    fontSize: 10,
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
