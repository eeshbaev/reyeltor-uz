import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { hapticLight } from '@/lib/haptics';
import { spacing, useTheme } from '@/lib/theme';

interface MapNearbyPlacesButtonProps {
  onPress: () => void;
}

export function MapNearbyPlacesButton({ onPress }: MapNearbyPlacesButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('listing.neighborhoodExplore')}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={styles.pressable}
    >
      <FrostedView style={[styles.chip, mapChromeBorder(theme)]} intensity={88}>
        <Ionicons name="location-outline" size={17} color={theme.colors.accent} />
        <AppText variant="label" color="accent" numberOfLines={1} style={styles.label}>
          {t('listing.neighborhoodExplore')}
        </AppText>
      </FrostedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: 999,
    maxWidth: '100%',
  },
  label: {
    flexShrink: 1,
  },
});
