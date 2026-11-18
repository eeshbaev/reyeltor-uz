import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { colorTokens } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import type { UserPurpose } from '@/types';

/** Most urgent need first. */
const GOALS: UserPurpose[] = ['rent', 'buy', 'investor', 'realtor'];

const ICONS: Record<UserPurpose, keyof typeof Ionicons.glyphMap> = {
  investor: 'trending-up-outline',
  realtor: 'briefcase-outline',
  rent: 'key-outline',
  buy: 'home-outline',
};

/** Onboarding uses a dark backdrop regardless of system theme. */
const palette = colorTokens.dark;

interface PurposePickerProps {
  /** Empty array = "Just browse". */
  onDone: (purposes: UserPurpose[]) => void;
}

/**
 * One question, one tap: the chosen card is the answer (no Continue button).
 * The answer sets the first search on the map, or the posting path for agents and owners.
 */
export function PurposePicker({ onDone }: PurposePickerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [chosen, setChosen] = useState<UserPurpose | null>(null);
  const grid = width >= 600;

  const choose = (purpose: UserPurpose) => {
    if (chosen) return;
    hapticLight();
    setChosen(purpose);
    // Let the pressed card confirm the choice for a moment before the map takes over.
    setTimeout(() => onDone([purpose]), reduceMotion ? 0 : 180);
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        grid && styles.contentWide,
        { paddingTop: insets.top + spacing.xxl + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <Animated.View entering={reduceMotion ? FadeIn.duration(150) : FadeInDown.duration(280)}>
        <AppText variant="h1" style={[styles.title, { color: palette.primary }]}>
          {t('purposes.titleOne')}
        </AppText>
        <AppText variant="body" style={[styles.subtitle, { color: palette.secondary }]}>
          {t('purposes.subtitleOne')}
        </AppText>
      </Animated.View>

      <View style={[styles.options, grid && styles.optionsGrid]}>
        {GOALS.map((purpose, index) => {
          const active = chosen === purpose;
          return (
            <Animated.View
              key={purpose}
              entering={reduceMotion ? FadeIn.duration(150) : FadeInDown.duration(280).delay(80 + index * 40)}
              style={grid ? styles.gridCell : undefined}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => choose(purpose)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: active ? palette.accent : palette.border,
                    backgroundColor: active ? palette.accentSurface : palette.surface,
                    transform: [{ scale: pressed || active ? 0.98 : 1 }],
                  },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: active ? palette.accent : palette.surfaceElevated }]}>
                  <Ionicons name={ICONS[purpose]} size={20} color={active ? palette.onAccent : palette.accent} />
                </View>
                <View style={styles.optionCopy}>
                  <AppText variant="body" style={[styles.optionTitle, { color: palette.primary }]}>
                    {t(`purposes.${purpose}`)}
                  </AppText>
                  <AppText variant="caption" style={{ color: palette.secondary }}>
                    {t(`purposes.${purpose}Hint`)}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.tertiary} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Pressable onPress={() => onDone([])} accessibilityRole="button" hitSlop={8} style={styles.browse}>
        <AppText variant="label" style={{ color: palette.secondary }}>
          {t('purposes.justBrowse')}
        </AppText>
      </Pressable>
      <AppText variant="caption" style={[styles.note, { color: palette.tertiary }]}>
        {t('purposes.note')}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  contentWide: { maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { letterSpacing: -0.4, fontWeight: '600' },
  subtitle: { lineHeight: 22, marginTop: spacing.sm },
  options: { gap: spacing.sm, marginTop: spacing.sm },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: '48.8%' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1, gap: 2 },
  optionTitle: { fontWeight: '600' },
  browse: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm },
  note: { textAlign: 'center' },
});
