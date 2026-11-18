import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';

/** Small, unobtrusive marker for illustrative (non-real) listings. */
export function DemoBadge() {
  const { t } = useTranslation();
  return (
    <View
      style={styles.badge}
      accessibilityRole="text"
      accessibilityLabel={t('demo.badgeA11y')}
    >
      <AppText variant="micro" style={styles.text}>
        {t('demo.badge')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  text: { color: fixedColors.white, fontWeight: '700', letterSpacing: 0.6 },
});
