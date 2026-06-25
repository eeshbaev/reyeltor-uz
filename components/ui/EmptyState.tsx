import { View, StyleSheet } from 'react-native';
import { Button } from './Button';
import { AppText } from './AppText';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

export type IllustrationType =
  | 'favorites'
  | 'myListings'
  | 'noResults'
  | 'agentEmpty'
  | 'mapEmpty'
  | 'guestFavorites'
  | 'archivedEmpty';

interface EmptyStateProps {
  illustration: IllustrationType;
  title: string;
  cta?: string;
  onCta?: () => void;
  secondaryCta?: string;
  onSecondaryCta?: () => void;
}

export function EmptyState({ illustration, title, cta, onCta, secondaryCta, onSecondaryCta }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Illustration type={illustration} />
      <AppText variant="body" color="secondary" style={styles.title}>
        {title}
      </AppText>
      {cta && onCta ? <Button label={cta} onPress={onCta} style={{ marginTop: spacing.lg }} /> : null}
      {secondaryCta && onSecondaryCta ? (
        <Button label={secondaryCta} variant="secondary" onPress={onSecondaryCta} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}

function Illustration({ type }: { type: IllustrationType }) {
  const theme = useTheme();

  const accent = theme.colors.accent;
  const surface = theme.colors.surface;
  const primary = theme.colors.primary;

  switch (type) {
    case 'favorites':
      return (
        <View style={styles.illustration}>
          <View style={[styles.pin, { backgroundColor: accent }]} />
          <View style={[styles.heart, { backgroundColor: theme.colors.danger }]} />
        </View>
      );
    case 'myListings':
      return (
        <View style={styles.illustration}>
          <View style={[styles.building, { backgroundColor: surface, borderColor: primary }]} />
          <View style={[styles.plus, { backgroundColor: accent }]} />
        </View>
      );
    case 'noResults':
    case 'mapEmpty':
      return (
        <View style={styles.illustration}>
          <View style={[styles.circle, { borderColor: accent }]} />
          <View style={[styles.handle, { backgroundColor: accent }]} />
        </View>
      );
    case 'agentEmpty':
      return (
        <View style={styles.illustration}>
          <View style={[styles.door, { backgroundColor: surface, borderColor: primary }]} />
        </View>
      );
    case 'guestFavorites':
      return (
        <View style={styles.illustration}>
          <View style={[styles.heart, { backgroundColor: accent, opacity: 0.6 }]} />
        </View>
      );
    case 'archivedEmpty':
      return (
        <View style={styles.illustration}>
          <View style={[styles.box, { backgroundColor: surface, borderColor: theme.colors.border }]} />
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl, paddingTop: spacing.xxl },
  title: { textAlign: 'center', marginTop: spacing.lg, maxWidth: 280 },
  illustration: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  pin: { width: 12, height: 12, borderRadius: 6, position: 'absolute', bottom: 20 },
  heart: { width: 32, height: 28, borderRadius: 8, transform: [{ rotate: '45deg' }] },
  building: { width: 48, height: 56, borderWidth: 2, borderRadius: 4 },
  plus: { width: 20, height: 20, borderRadius: 10, position: 'absolute', right: 8, top: 8 },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
  handle: { width: 16, height: 24, borderRadius: 4, position: 'absolute', bottom: 8, right: 12, transform: [{ rotate: '45deg' }] },
  door: { width: 36, height: 52, borderWidth: 2, borderRadius: 4 },
  box: { width: 48, height: 36, borderWidth: 1, borderRadius: 6 },
});
