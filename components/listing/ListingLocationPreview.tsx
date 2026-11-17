import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
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
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      <View style={[styles.mapWrap, { backgroundColor: theme.colors.border }]}>
        <Image source={{ uri: mapUrl }} style={styles.map} contentFit="cover" />
        <View style={styles.pinWrap} pointerEvents="none">
          <Ionicons name="location" size={28} color={theme.colors.danger} />
        </View>
      </View>
      <View style={styles.linkRow}>
        <Ionicons name="navigate-outline" size={16} color={theme.colors.accent} />
        <AppText variant="label" color="accent">
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1 },
    }),
  },
  title: {
    letterSpacing: -0.3,
  },
  mapWrap: {
    width: '100%',
    height: 148,
    borderRadius: 14,
    overflow: 'hidden',
  },
  map: { width: '100%', height: '100%' },
  pinWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -12 }],
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
