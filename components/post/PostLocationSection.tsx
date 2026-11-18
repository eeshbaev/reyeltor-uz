import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AddressSuggestionsField } from '@/components/post/AddressSuggestionsField';
import { PostFormChip } from '@/components/post/PostFormChip';
import { PostFormChipRow } from '@/components/post/PostFormChipRow';
import { PostFormSection } from '@/components/post/PostFormSection';
import { AppText } from '@/components/ui/AppText';
import { TASHKENT_DISTRICTS } from '@/lib/constants';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import type { LocationSuggestion } from '@/lib/map/locationSuggestions';
import { useTheme } from '@/lib/theme';

interface PostLocationSectionProps {
  district: string;
  lat: number;
  lng: number;
  pinExact: boolean;
  addressLabel?: string | null;
  locationQuery: string;
  onLocationQueryChange: (value: string) => void;
  locationSuggestions: LocationSuggestion[];
  locationSearching?: boolean;
  selectedSuggestionId?: string | null;
  onSelectSuggestion: (suggestion: LocationSuggestion) => void;
  onSelectDistrict: (district: string) => void;
  onOpenPinPicker: () => void;
  onUseCurrentLocation?: () => void;
  gpsLoading?: boolean;
}

export function PostLocationSection({
  district,
  lat,
  lng,
  pinExact,
  addressLabel,
  locationQuery,
  onLocationQueryChange,
  locationSuggestions,
  locationSearching = false,
  selectedSuggestionId = null,
  onSelectSuggestion,
  onSelectDistrict,
  onOpenPinPicker,
  onUseCurrentLocation,
  gpsLoading = false,
}: PostLocationSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <PostFormSection title={t('listing.location')} subtitle={t('listing.locationHint')}>
      <AddressSuggestionsField
        value={locationQuery}
        onChangeText={onLocationQueryChange}
        suggestions={locationSuggestions}
        loading={locationSearching}
        selectedId={selectedSuggestionId}
        onSelect={onSelectSuggestion}
      />

      {onUseCurrentLocation ? (
        <Pressable
          onPress={onUseCurrentLocation}
          disabled={gpsLoading}
          style={[styles.actionBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Ionicons name="navigate" size={18} color={theme.colors.accent} />
          )}
          <AppText variant="label" color="accent">
            {t('listing.useCurrentLocation')}
          </AppText>
        </Pressable>
      ) : null}

      <AppText variant="caption" color="secondary" style={styles.chipsLabel}>
        {t('listing.districtChips')}
      </AppText>
      <PostFormChipRow horizontal>
        {TASHKENT_DISTRICTS.map((name) => (
          <PostFormChip
            key={name}
            label={name}
            selected={district === name}
            activeColor={theme.colors.accent}
            onPress={() => onSelectDistrict(name)}
          />
        ))}
      </PostFormChipRow>

      <View style={[styles.pinStatus, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Ionicons name="location" size={18} color={theme.colors.accent} />
        <View style={styles.pinStatusText}>
          <AppText variant="label">{district}</AppText>
          {addressLabel ? (
            <AppText variant="body" style={styles.addressLabel}>
              {addressLabel}
            </AppText>
          ) : null}
          <AppText variant="caption" color="secondary">
            {pinExact ? t('listing.pinExact') : t('listing.pinDistrictCenter')}
          </AppText>
          <AppText variant="micro" color="tertiary">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </AppText>
        </View>
      </View>

      <Pressable
        onPress={onOpenPinPicker}
        style={[styles.actionBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
      >
        <Ionicons name="map-outline" size={20} color={theme.colors.accent} />
        <AppText variant="label" color="accent">
          {t('listing.changePin')}
        </AppText>
      </Pressable>
    </PostFormSection>
  );
}

const styles = StyleSheet.create({
  chipsLabel: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  pinStatus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  pinStatusText: {
    flex: 1,
    gap: 2,
  },
  addressLabel: {
    fontWeight: '600',
    lineHeight: 20,
  },
});
