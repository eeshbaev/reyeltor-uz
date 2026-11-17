import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { getListingCategory } from '@/lib/listing';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

interface ListingToolLinksProps {
  listing: ListingWithPhotos;
  /** Called before navigating (e.g. to close a bottom sheet). */
  onNavigate?: () => void;
}

type ToolLink = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  pathname: '/(tabs)/tools/mortgage' | '/(tabs)/tools/rent-vs-buy' | '/(tabs)/tools/renovation';
  params: Record<string, string>;
};

/** Opens Reyeltor's calculators already filled with this property's price, rent or area. */
export function ListingToolLinks({ listing, onNavigate }: ListingToolLinksProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const residential = getListingCategory(listing) === 'residential';
  const price = String(listing.price);

  const links: ToolLink[] = [];
  if (listing.type === 'buy') {
    links.push({ key: 'mortgage', icon: 'card-outline', label: t('tools.mortgage.title'), pathname: '/(tabs)/tools/mortgage', params: { price } });
    if (residential) {
      links.push({ key: 'rentVsBuy', icon: 'swap-horizontal-outline', label: t('tools.rentVsBuy.title'), pathname: '/(tabs)/tools/rent-vs-buy', params: { price } });
    }
  } else if (listing.type === 'rent' && residential) {
    links.push({ key: 'rentVsBuy', icon: 'swap-horizontal-outline', label: t('tools.rentVsBuy.title'), pathname: '/(tabs)/tools/rent-vs-buy', params: { rent: price } });
  }
  if (residential && listing.area_m2 > 0) {
    links.push({ key: 'renovation', icon: 'hammer-outline', label: t('tools.renovation.title'), pathname: '/(tabs)/tools/renovation', params: { area: String(listing.area_m2) } });
  }

  if (links.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <AppText variant="h3">{t('listingTools.title')}</AppText>
      <AppText variant="caption" color="secondary">
        {t('listingTools.hint')}
      </AppText>
      <View style={styles.row}>
        {links.map((link) => (
          <Pressable
            key={link.key}
            accessibilityRole="button"
            onPress={() => {
              onNavigate?.();
              router.push({ pathname: link.pathname, params: link.params });
            }}
            style={({ pressed }) => [
              styles.chip,
              { borderColor: theme.colors.border, backgroundColor: pressed ? theme.colors.accentSurface : theme.colors.surface },
            ]}
          >
            <Ionicons name={link.icon} size={16} color={theme.colors.accent} />
            <AppText variant="label" color="accent">
              {link.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, marginTop: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
