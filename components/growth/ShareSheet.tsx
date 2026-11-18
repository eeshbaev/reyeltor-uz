import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import {
  shareViaChannelAndRemember,
  type ShareChannel,
} from '@/lib/growth/quickShare';
import type { SharePayload } from '@/lib/growth/sharePreference';
import { hapticLight } from '@/lib/haptics';
import { useTheme } from '@/lib/theme';

export type { SharePayload } from '@/lib/growth/sharePreference';

export interface ShareSheetRef {
  present: (payload: SharePayload) => void;
  dismiss: () => void;
}

export const ShareSheet = forwardRef<ShareSheetRef>((_props, ref) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [busy, setBusy] = useState<ShareChannel | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setPayload(null);
    setBusy(null);
  }, []);

  useImperativeHandle(ref, () => ({
    present(next) {
      setPayload(next);
      setVisible(true);
    },
    dismiss,
  }));

  const runShare = useCallback(
    async (channel: ShareChannel) => {
      if (!payload || busy) return;
      hapticLight();
      setBusy(channel);
      dismiss();
      try {
        await shareViaChannelAndRemember(channel, payload);
      } catch (error) {
        console.warn('Share failed:', error);
      } finally {
        setBusy(null);
      }
    },
    [busy, dismiss, payload],
  );

  const handleTelegram = useCallback(() => runShare('telegram'), [runShare]);
  const handleWhatsApp = useCallback(() => runShare('whatsapp'), [runShare]);
  const handlePdf = useCallback(() => runShare('pdf'), [runShare]);
  const handleOther = useCallback(() => runShare('other'), [runShare]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
        <AppText variant="h3" style={styles.title}>
          {payload?.title ?? t('growth.shareTitle')}
        </AppText>

        <Pressable
          style={[styles.row, { borderColor: theme.colors.border }]}
          onPress={handleTelegram}
          disabled={busy !== null}
        >
          <View style={[styles.iconWrap, { backgroundColor: fixedColors.telegramTint }]}>
            {busy === 'telegram' ? (
              <ActivityIndicator size="small" color={fixedColors.telegram} />
            ) : (
              <Ionicons name="paper-plane-outline" size={22} color={fixedColors.telegram} />
            )}
          </View>
          <AppText variant="label">{t('growth.shareTelegram')}</AppText>
        </Pressable>

        <Pressable
          style={[styles.row, { borderColor: theme.colors.border }]}
          onPress={handleWhatsApp}
          disabled={busy !== null}
        >
          <View style={[styles.iconWrap, { backgroundColor: fixedColors.whatsappTint }]}>
            {busy === 'whatsapp' ? (
              <ActivityIndicator size="small" color={fixedColors.whatsapp} />
            ) : (
              <Ionicons name="logo-whatsapp" size={22} color={fixedColors.whatsapp} />
            )}
          </View>
          <AppText variant="label">{t('growth.shareWhatsApp')}</AppText>
        </Pressable>

        {payload?.pdf ? (
          <Pressable
            style={[styles.row, { borderColor: theme.colors.border }]}
            onPress={handlePdf}
            disabled={busy !== null}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.accent}18` }]}>
              {busy === 'pdf' ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Ionicons name="document-text-outline" size={22} color={theme.colors.accent} />
              )}
            </View>
            <AppText variant="label">{t('growth.sharePdf')}</AppText>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.row, { borderColor: theme.colors.border }]}
          onPress={handleOther}
          disabled={busy !== null}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.text}18` }]}>
            {busy === 'other' ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <Ionicons name="share-outline" size={22} color={theme.colors.text} />
            )}
          </View>
          <AppText variant="label">{t('growth.shareOther')}</AppText>
        </Pressable>

        <Pressable style={styles.cancel} onPress={dismiss}>
          <AppText variant="label" color="secondary">
            {t('common.cancel')}
          </AppText>
        </Pressable>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  title: { marginBottom: spacing.md, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { alignItems: 'center', paddingVertical: spacing.lg },
});
