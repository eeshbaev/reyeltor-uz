import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { hapticLight } from '@/lib/haptics';
import { useTheme } from '@/lib/theme';

export function BackButton({
  href,
  fallbackHref = '/(tabs)/tools',
}: {
  href?: Href;
  fallbackHref?: Href;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        hapticLight();
        if (href) {
          router.navigate(href);
          return;
        }
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace(fallbackHref);
      }}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
    >
      <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 4, marginLeft: -4 },
});
