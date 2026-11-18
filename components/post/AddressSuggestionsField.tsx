import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import type { LocationSuggestion, LocationSuggestionKind } from '@/lib/map/locationSuggestions';
import { useTheme } from '@/lib/theme';

interface AddressSuggestionsFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  suggestions: LocationSuggestion[];
  loading?: boolean;
  selectedId?: string | null;
  onSelect: (suggestion: LocationSuggestion) => void;
  placeholder?: string;
}

function suggestionIcon(kind: LocationSuggestionKind) {
  switch (kind) {
    case 'district':
      return 'map-outline' as const;
    case 'metro':
      return 'train-outline' as const;
    case 'mall':
      return 'storefront-outline' as const;
    case 'landmark':
      return 'business-outline' as const;
    default:
      return 'location-outline' as const;
  }
}

function suggestionBadge(kind: LocationSuggestionKind, t: (key: string) => string) {
  switch (kind) {
    case 'district':
      return t('listing.suggestionDistrict');
    case 'metro':
      return t('listing.suggestionMetro');
    case 'mall':
      return t('listing.suggestionMall');
    case 'landmark':
      return t('listing.suggestionLandmark');
    default:
      return t('listing.suggestionAddress');
  }
}

export function AddressSuggestionsField({
  value,
  onChangeText,
  suggestions,
  loading = false,
  selectedId = null,
  onSelect,
  placeholder,
}: AddressSuggestionsFieldProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const showSuggestions = value.trim().length > 0 && (loading || suggestions.length > 0);

  return (
    <View style={styles.wrap}>
      <View style={[styles.inputWrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <Ionicons name="search" size={18} color={theme.colors.tertiary} style={styles.searchIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? t('listing.locationSearchUnified')}
          style={[styles.input, { color: theme.colors.primary }]}
          placeholderTextColor={theme.colors.tertiary}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {loading ? <ActivityIndicator size="small" color={theme.colors.accent} style={styles.loader} /> : null}
      </View>

      {showSuggestions ? (
        <View
          style={[
            styles.list,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated },
          ]}
        >
          {loading && suggestions.length === 0 ? (
            <View style={styles.row}>
              <AppText variant="caption" color="secondary">
                {t('listing.addressLookingUp')}
              </AppText>
            </View>
          ) : null}

          {!loading && suggestions.length === 0 ? (
            <View style={styles.row}>
              <AppText variant="caption" color="secondary">
                {t('listing.noLocationResults')}
              </AppText>
            </View>
          ) : null}

          {suggestions.map((item) => {
            const selected = selectedId === item.id;
            const icon = suggestionIcon(item.kind);
            const badge = suggestionBadge(item.kind, t);

            return (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item)}
                style={[styles.row, selected && { backgroundColor: theme.colors.accentSurface }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.accentSurface }]}>
                  <Ionicons
                    name={icon}
                    size={16}
                    color={selected ? theme.colors.accent : theme.colors.secondary}
                  />
                </View>
                <View style={styles.copy}>
                  <AppText variant="body" color={selected ? 'accent' : 'primary'} numberOfLines={2}>
                    {item.label}
                  </AppText>
                  <AppText variant="micro" color="secondary">
                    {badge}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.sm + 2,
  },
  loader: {
    marginLeft: spacing.sm,
  },
  list: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
