import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { getInitials } from '@/lib/format';
import { useTheme } from '@/lib/theme';

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string | null;
}

export function Avatar({ name, size = 48, imageUrl }: AvatarProps) {
  const theme = useTheme();
  const fontScale = size * 0.38;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surface,
        }}
        contentFit="cover"
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
