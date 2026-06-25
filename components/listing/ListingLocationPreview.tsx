import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { getStaticMapUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

interface ListingLocationPreviewProps {
  lat: number;
  lng: number;
  onPress: () => void;
  title: string;
  subtitle: string;
}

export function ListingLocationPreview({ lat, lng, onPress, title, subtitle }: ListingLocationPreviewProps) {
  const theme = useTheme();
  const mapUrl = getStaticMapUrl(lat, lng, 640, 280);

  if (!mapUrl) return null;

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      <View style={styles.mapWrap}>
        <Image source={{ uri: mapUrl }} style={styles.map} contentFit="cover" />
        <View style={styles.pinWrap} pointerEvents="none">
          <Ionicons name="location" size={28} color={theme.colors.error} />
        </View>
      </View>
      <AppText variant="label" color="accent">
        {subtitle}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  title: { marginBottom: spacing.sm },
  mapWrap: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  map: { width: '100%', height: '100%' },
  pinWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -12 }],
  },
});
