import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colorTokens } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { USER_PURPOSES } from '@/lib/purposes';
import type { UserPurpose } from '@/types';

const ICONS: Record<UserPurpose, keyof typeof Ionicons.glyphMap> = {
  investor: 'trending-up-outline',
  realtor: 'briefcase-outline',
  rent: 'key-outline',
  buy: 'home-outline',
};

/** Onboarding uses a dark backdrop regardless of system theme. */
const palette = colorTokens.dark;

interface PurposePickerProps {
  onDone: (purposes: UserPurpose[]) => void;
}

export function PurposePicker({ onDone }: PurposePickerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<UserPurpose[]>([]);

  const toggle = (purpose: UserPurpose) =>
    setSelected((prev) => (prev.includes(purpose) ? prev.filter((p) => p !== purpose) : [...prev, purpose]));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xxl + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <AppText variant="h1" style={[styles.title, { color: palette.primary }]}>
        {t('purposes.title')}
      </AppText>
      <AppText variant="body" style={[styles.subtitle, { color: palette.secondary }]}>
        {t('purposes.subtitle')}
      </AppText>

      <View style={styles.options}>
        {USER_PURPOSES.map((purpose) => {
          const active = selected.includes(purpose);
          return (
            <Pressable
              key={purpose}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              onPress={() => toggle(purpose)}
              style={[
                styles.option,
                {
                  borderColor: active ? palette.accent : palette.border,
                  backgroundColor: active ? palette.accentSurface : palette.surface,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: active ? palette.accent : palette.surfaceElevated }]}>
                <Ionicons name={ICONS[purpose]} size={20} color={active ? palette.onAccent : palette.accent} />
              </View>
              <View style={styles.optionCopy}>
                <AppText variant="label" style={{ color: palette.primary }}>
                  {t(`purposes.${purpose}`)}
                </AppText>
                <AppText variant="caption" style={{ color: palette.secondary }}>
                  {t(`purposes.${purpose}Hint`)}
                </AppText>
              </View>
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={active ? palette.accent : palette.tertiary}
              />
            </Pressable>
          );
        })}
      </View>

      <AppText variant="caption" style={[styles.note, { color: palette.tertiary }]}>
        {t('purposes.note')}
      </AppText>

      <Button
        label={selected.length > 0 ? t('purposes.continue') : t('purposes.skip')}
        variant={selected.length > 0 ? 'primary' : 'secondary'}
        onPress={() => onDone(selected)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  title: { letterSpacing: -0.4 },
  subtitle: { lineHeight: 22, marginBottom: spacing.sm },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1, gap: 2 },
  note: { textAlign: 'center', marginVertical: spacing.sm },
});
