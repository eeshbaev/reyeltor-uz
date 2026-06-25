import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { AppText } from '@/components/ui/AppText';
import { DEFAULT_LANGUAGE, LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/constants';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';
import { useTheme } from '@/lib/theme';

interface LanguageDropdownProps {
  onSelect: (lang: SupportedLanguage) => void;
}

function resolveLanguage(code: string): SupportedLanguage {
  const base = code.split('-')[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

export function LanguageDropdown({ onSelect }: LanguageDropdownProps) {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = resolveLanguage(i18n.language);

  const handleSelect = (lang: SupportedLanguage) => {
    hapticLight();
    setOpen(false);
    onSelect(lang);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={LANGUAGE_LABELS[current]}
      >
        <AppText variant="label">{LANGUAGE_LABELS[current]}</AppText>
        <Ionicons name="chevron-down" size={16} color={theme.colors.secondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.menu,
              {
                top: insets.top + spacing.sm,
                right: spacing.md,
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                shadowColor: theme.isDark ? '#000' : '#1a1a1a',
              },
            ]}
          >
            <ScrollView bounces={false} style={styles.menuScroll}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const active = current === lang;
                return (
                  <Pressable
                    key={lang}
                    onPress={() => handleSelect(lang)}
                    style={[
                      styles.option,
                      active && { backgroundColor: theme.colors.accentSurface },
                    ]}
                  >
                    <AppText variant="body" color={active ? 'accent' : 'primary'}>
                      {LANGUAGE_LABELS[lang]}
                    </AppText>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  menu: {
    position: 'absolute',
    minWidth: 180,
    maxHeight: 320,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuScroll: {
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
});
