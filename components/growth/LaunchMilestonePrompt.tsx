import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReyeltorCoin } from '@/components/brand/ReyeltorCoin';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { openAppRating } from '@/lib/growth/rateApp';
import { hapticLight } from '@/lib/haptics';
import { useTheme } from '@/lib/theme';

interface LaunchMilestonePromptProps {
  visible: boolean;
  showInvite: boolean;
  onDismiss: () => void;
  onInvite: () => void;
}

export function LaunchMilestonePrompt({
  visible,
  showInvite,
  onDismiss,
  onInvite,
}: LaunchMilestonePromptProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const handleRate = useCallback(async () => {
    hapticLight();
    onDismiss();
    await openAppRating();
  }, [onDismiss]);

  const handleInvite = useCallback(() => {
    hapticLight();
    onDismiss();
    onInvite();
  }, [onDismiss, onInvite]);

  const handleLater = useCallback(() => {
    hapticLight();
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleLater}>
      <Pressable style={styles.backdrop} onPress={handleLater} />
      <View style={[styles.center, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.iconRow}>
            <ReyeltorCoin size="sm" />
            <Ionicons name="star" size={22} color={theme.colors.accent} />
          </View>
          <AppText variant="h3" style={styles.title}>
            {t('growth.milestoneTitle')}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.message}>
            {t('growth.milestoneMessage')}
          </AppText>

          <Button label={t('growth.rateUs')} onPress={handleRate} />
          {showInvite ? (
            <Button
              label={t('growth.milestoneInvite')}
              variant="secondary"
              onPress={handleInvite}
              style={styles.secondaryBtn}
            />
          ) : null}
          <Pressable onPress={handleLater} style={styles.later}>
            <AppText variant="label" color="secondary">
              {t('growth.milestoneLater')}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  center: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', lineHeight: 22, marginBottom: spacing.sm },
  secondaryBtn: { marginTop: spacing.xs },
  later: { alignItems: 'center', paddingVertical: spacing.md },
});
