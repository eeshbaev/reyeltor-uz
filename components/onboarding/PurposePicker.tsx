import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { colorTokens } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { DEFAULT_FILTERS, type ListingFilters, type UserPurpose } from '@/types';

type Deal = 'rent' | 'buy';

interface TypeOption {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'residential' | 'commercial';
  propertyType: string | null;
}

/** What people look for, per deal. The pick becomes the map's first filter. */
const TYPES: Record<Deal, Omit<TypeOption, 'label'>[]> = {
  rent: [
    { key: 'apartment', icon: 'business-outline', category: 'residential', propertyType: 'apartment' },
    { key: 'house', icon: 'home-outline', category: 'residential', propertyType: 'country_house' },
    { key: 'office', icon: 'briefcase-outline', category: 'commercial', propertyType: 'office' },
    { key: 'shop', icon: 'storefront-outline', category: 'commercial', propertyType: 'retail' },
    { key: 'warehouse', icon: 'cube-outline', category: 'commercial', propertyType: 'warehouse' },
  ],
  buy: [
    { key: 'apartment', icon: 'business-outline', category: 'residential', propertyType: 'apartment' },
    { key: 'house', icon: 'home-outline', category: 'residential', propertyType: 'country_house' },
    { key: 'land', icon: 'leaf-outline', category: 'residential', propertyType: 'vacant_land' },
    { key: 'office', icon: 'briefcase-outline', category: 'commercial', propertyType: 'office' },
    { key: 'shop', icon: 'storefront-outline', category: 'commercial', propertyType: 'retail' },
  ],
};

/** Onboarding uses a dark backdrop regardless of system theme. */
const palette = colorTokens.dark;

interface PurposePickerProps {
  /** `purposes` empty = "Just browse"; `filters` is the first map search when the person chose one. */
  onDone: (purposes: UserPurpose[], filters: ListingFilters | null) => void;
}

/**
 * Two taps: rent or buy, then what. The answers set the map's first filters.
 */
export function PurposePicker({ onDone }: PurposePickerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [done, setDone] = useState(false);
  const wide = width >= 600;

  useEffect(() => {
    if (!deal) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setDeal(null);
      return true;
    });
    return () => sub.remove();
  }, [deal]);

  const finish = (purposes: UserPurpose[], filters: ListingFilters | null) => {
    if (done) return;
    hapticLight();
    setDone(true);
    setTimeout(() => onDone(purposes, filters), reduceMotion ? 0 : 160);
  };

  const pickType = (option: Omit<TypeOption, 'label'> | null) => {
    if (!deal) return;
    const sale = deal === 'buy';
    const category = option?.category ?? 'residential';
    const filters: ListingFilters = {
      ...DEFAULT_FILTERS,
      category,
      residentialTransaction: category === 'residential' ? (sale ? 'sale' : 'rent') : null,
      commercialTransaction: category === 'commercial' ? (sale ? 'sale' : 'lease') : null,
      propertyType: option?.propertyType ?? null,
    };
    finish([deal], filters);
  };

  const enter = (delay: number) => (reduceMotion ? FadeIn.duration(150) : FadeInDown.duration(260).delay(delay));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        wide && styles.contentWide,
        { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg },
      ]}
      bounces={false}
    >
      {deal === null ? (
        <View key="deal" style={styles.stack}>
          <Animated.View entering={enter(0)}>
            <AppText variant="h1" style={styles.title}>
              {t('purposes.titleOne')}
            </AppText>
          </Animated.View>
          {(['rent', 'buy'] as const).map((value, index) => (
            <Animated.View key={value} entering={enter(60 + index * 50)}>
              <Row
                icon={value === 'rent' ? 'key-outline' : 'home-outline'}
                label={t(`purposes.${value}`)}
                big
                onPress={() => {
                  hapticLight();
                  setDeal(value);
                }}
              />
            </Animated.View>
          ))}
          <Pressable
            onPress={() => finish([], null)}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.browse}
          >
            <AppText variant="label" style={styles.muted}>
              {t('purposes.justBrowse')}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View key="type" style={styles.stack}>
          <Animated.View entering={enter(0)}>
            <Pressable
              onPress={() => setDeal(null)}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={12}
              style={styles.back}
            >
              <Ionicons name="chevron-back" size={20} color={palette.secondary} />
              <AppText variant="label" style={styles.muted}>
                {t('common.back')}
              </AppText>
            </Pressable>
            <AppText variant="h1" style={styles.title}>
              {deal === 'rent' ? t('purposes.titleRent') : t('purposes.titleBuy')}
            </AppText>
          </Animated.View>
          {TYPES[deal].map((option, index) => (
            <Animated.View key={option.key} entering={enter(50 + index * 40)}>
              <Row icon={option.icon} label={typeLabel(t, option)} onPress={() => pickType(option)} />
            </Animated.View>
          ))}
          <Pressable onPress={() => pickType(null)} accessibilityRole="button" hitSlop={8} style={styles.browse}>
            <AppText variant="label" style={styles.muted}>
              {t('filters.residentialTypes.any')}
            </AppText>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function typeLabel(t: (key: string) => string, option: Omit<TypeOption, 'label'>): string {
  switch (option.key) {
    case 'house':
      return t('purposes.typeHouse');
    case 'shop':
      return t('purposes.typeShop');
    case 'land':
      return t('filters.residentialTypes.vacant_land');
    case 'apartment':
      return t('filters.residentialTypes.apartment');
    case 'office':
      return t('filters.commercialTypes.office');
    case 'warehouse':
      return t('filters.commercialTypes.warehouse');
    default:
      return option.key;
  }
}

function Row({
  icon,
  label,
  onPress,
  big = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  big?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, big && styles.rowBig, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={palette.accent} />
      </View>
      <AppText variant={big ? 'h3' : 'body'} style={styles.rowLabel}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={palette.tertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Content sits in the lower half, where the thumb is.
  content: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.lg },
  contentWide: { maxWidth: 520, width: '100%', alignSelf: 'center' },
  stack: { gap: spacing.smd },
  title: { color: palette.primary, letterSpacing: -0.4, fontWeight: '600', marginBottom: spacing.xs },
  muted: { color: palette.secondary },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.md, alignSelf: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(30,30,30,0.92)',
  },
  rowBig: { minHeight: 76 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceElevated,
  },
  rowLabel: { flex: 1, color: palette.primary, fontWeight: '600' },
  browse: { alignSelf: 'center', paddingVertical: spacing.smd },
});
