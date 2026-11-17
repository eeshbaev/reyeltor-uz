import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/lib/design/spacing';
import {
  pickProfilePhotoFromLibrary,
  removeProfileAvatar,
  resolveAvatarUrl,
  uploadProfileAvatar,
} from '@/lib/profile/avatar';
import { useTheme } from '@/lib/theme';

interface ProfileAvatarEditorProps {
  userId: string;
  name: string;
  avatarPath?: string | null;
  onUpdated: () => Promise<void>;
  compact?: boolean;
}

export function ProfileAvatarEditor({
  userId,
  name,
  avatarPath,
  onUpdated,
  compact = false,
}: ProfileAvatarEditorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const imageUrl = resolveAvatarUrl(avatarPath);
  const hasPhoto = Boolean(avatarPath?.trim());

  const handlePick = async () => {
    const picked = await pickProfilePhotoFromLibrary();
    if (!picked.ok) {
      if (picked.reason === 'denied') {
        Alert.alert(t('profile.photoPermissionDenied'));
      }
      return;
    }

    setUploading(true);
    const result = await uploadProfileAvatar(userId, picked.asset, avatarPath);
    setUploading(false);

    if (!result.ok) {
      Alert.alert(t('profile.photoUploadFailed'), result.message);
      return;
    }

    await onUpdated();
    Alert.alert(t('profile.photoSaved'));
  };

  const handleRemove = async () => {
    setUploading(true);
    const ok = await removeProfileAvatar(userId, avatarPath);
    setUploading(false);

    if (!ok) {
      Alert.alert(t('common.error'));
      return;
    }

    await onUpdated();
    Alert.alert(t('profile.photoRemoved'));
  };

  const confirmRemove = () => {
    if (uploading || !hasPhoto) return;
    Alert.alert(t('profile.removePhotoTitle'), t('profile.removePhotoConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.removePhoto'),
        style: 'destructive',
        onPress: () => void handleRemove(),
      },
    ]);
  };

  const openPhotoOptions = () => {
    if (uploading) return;

    const buttons: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [
      { text: t('profile.choosePhoto'), onPress: () => void handlePick() },
    ];

    if (hasPhoto) {
      buttons.push({
        text: t('profile.removePhoto'),
        style: 'destructive',
        onPress: confirmRemove,
      });
    }

    buttons.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(t('profile.changePhoto'), undefined, buttons);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={openPhotoOptions}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={t('profile.changePhoto')}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <View>
          <Avatar name={name} size={compact ? 72 : 88} imageUrl={imageUrl} />
          <View style={[styles.badge, { backgroundColor: theme.colors.accent, borderColor: theme.colors.background }]}>
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.onAccent} />
            ) : (
              <Ionicons name="camera" size={16} color={theme.colors.onAccent} />
            )}
          </View>
        </View>
      </Pressable>

      {!compact ? (
        <>
          <AppText variant="caption" color="secondary" style={styles.hint}>
            {t('profile.changePhotoHint')}
          </AppText>
          <View style={styles.actions}>
            <Button
              label={hasPhoto ? t('profile.changePhotoAction') : t('profile.addPhoto')}
              onPress={handlePick}
              loading={uploading}
              fullWidth={false}
              style={styles.actionButton}
            />
            {hasPhoto ? (
              <Button
                label={t('profile.removePhoto')}
                variant="secondary"
                onPress={confirmRemove}
                disabled={uploading}
                fullWidth={false}
                style={styles.actionButton}
              />
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    maxWidth: 280,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    minWidth: 148,
  },
});
