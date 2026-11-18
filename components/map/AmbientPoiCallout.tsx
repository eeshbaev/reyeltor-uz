import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';

interface AmbientPoiCalloutProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
}

export function AmbientPoiCallout({ title, subtitle, accentColor = fixedColors.slate900 }: AmbientPoiCalloutProps) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.bubble, { borderColor: `${accentColor}33` }]}>
        <AppText variant="micro" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="micro" color="secondary" style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.stem, { backgroundColor: accentColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 4,
    maxWidth: 160,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: fixedColors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
  subtitle: {
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 12,
  },
  stem: {
    width: 2,
    height: 5,
    borderRadius: radius.pill,
    opacity: 0.45,
  },
});
