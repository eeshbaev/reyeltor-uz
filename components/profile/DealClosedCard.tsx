import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

export interface DealClosed {
  listing: ListingWithPhotos;
  reason: 'rented' | 'sold';
}

/**
 * The ending of a listing's story: "Rented in 9 days · 41 views". A real ending gives the
 * moment its weight (design doc: Motion — closing summary). Numbers are the listing's own.
 */
export function DealClosedCard({
  deal,
  onPostAnother,
  onClose,
}: {
  deal: DealClosed | null;
  onPostAnother: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  if (!deal) return null;

  const days = Math.max(1, Math.round((Date.now() - Date.parse(deal.listing.posted_at)) / 86_400_000));
  const views = deal.listing.view_count ?? 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          entering={reduceMotion ? FadeIn.duration(150) : ZoomIn.springify().damping(16).stiffness(180)}
          style={[styles.card, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
        >
          <View style={[styles.icon, { backgroundColor: theme.colors.successSurface }]}>
            <Ionicons name={deal.reason === 'rented' ? 'key' : 'checkmark-done'} size={28} color={theme.colors.success} />
          </View>
          <AppText variant="h2" style={styles.centerText}>
            {t(deal.reason === 'rented' ? 'dealClosed.rentedIn' : 'dealClosed.soldIn', { count: days, days })}
          </AppText>
          <AppText variant="body" color="secondary" tabular style={styles.centerText}>
            {t('dealClosed.stats', { views })}
          </AppText>
          <AppText variant="caption" color="tertiary" style={styles.centerText}>
            {t('dealClosed.reactivateHint')}
          </AppText>
          <Button label={t('dealClosed.postAnother')} onPress={onPostAnother} />
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.done} hitSlop={8}>
            <AppText variant="label" color="secondary">
              {t('dealClosed.done')}
            </AppText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  center: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.smd,
    alignItems: 'stretch',
  },
  icon: { width: 56, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  centerText: { textAlign: 'center' },
  done: { alignSelf: 'center', paddingVertical: spacing.sm },
});
