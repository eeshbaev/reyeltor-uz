import { useEffect, useState } from 'react';
import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { getInitials } from '@/lib/format';
import { useTheme } from '@/lib/theme';

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string | null;
  source?: ImageSource | null;
}

export function Avatar({ name, size = 48, imageUrl, source }: AvatarProps) {
  const theme = useTheme();
  const fontScale = size * 0.38;
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedSource = source ?? (imageUrl ? { uri: imageUrl } : null);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl, source]);

  if (resolvedSource && !imageFailed) {
    return (
      <Image
        source={resolvedSource}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surface,
        }}
        contentFit="cover"
        transition={0}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.accent,
        },
      ]}
    >
      <Text allowFontScaling style={[styles.initials, { fontSize: fontScale, color: theme.colors.onAccent }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700' },
});
