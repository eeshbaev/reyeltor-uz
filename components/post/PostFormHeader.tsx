import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';

export function PostFormHeader() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      <AppText variant="h1" style={styles.title}>
        {t('listing.postTitle')}
      </AppText>
      <AppText variant="body" color="secondary">
        {t('listing.postSubtitle')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
  },
});
