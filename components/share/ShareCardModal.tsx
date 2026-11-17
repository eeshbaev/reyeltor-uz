import { useCallback, useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListingShareCard, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '@/components/share/ListingShareCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { hapticSuccess } from '@/lib/haptics';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { getListingWebUrl } from '@/lib/listingLinks';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

interface ShareCardModalProps {
  listing: ListingWithPhotos | null;
  onClose: () => void;
  /** Called after the image or link was handed to the system share sheet / clipboard. */
  onShared?: () => void;
}

/** Preview + export of the branded listing card (PNG with QR code) and its public link. */
export function ShareCardModal({ listing, onClose, onShared }: ShareCardModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { formatPrice } = useFormatPrice();
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPhotoReady(false);
    if (!listing) return;
    // Never wait forever for a slow photo; the card still looks fine with the placeholder.
    const timer = setTimeout(() => setPhotoReady(true), 4000);
    return () => clearTimeout(timer);
  }, [listing]);

  const url = listing ? getListingWebUrl(listing.id) : '';

  const shareImage = useCallback(async () => {
    if (!listing || !cardRef.current) return;
    setBusy(true);
    try {
      // Loaded on demand: a build without the native module then only disables the image
      // share instead of crashing every screen that imports this modal.
      const { captureRef } = await import('react-native-view-shot');
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: SHARE_CARD_WIDTH * 3,
        height: SHARE_CARD_HEIGHT * 3,
        result: 'tmpfile',
      });
      // The image carries the QR code; the link is copied too so it can be pasted as a caption.
      await Clipboard.setStringAsync(url);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('common.error'));
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('sellerTools.shareCardTitle') });
      hapticSuccess();
      onShared?.();
    } catch (error) {
      console.warn('Share card failed:', error);
      Alert.alert(t('common.error'));
    } finally {
      setBusy(false);
    }
  }, [listing, onShared, t, url]);

  const copyLink = useCallback(async () => {
    await Clipboard.setStringAsync(url);
    hapticSuccess();
    onShared?.();
    Alert.alert(t('sellerTools.linkCopied'), url);
  }, [onShared, t, url]);

  return (
    <Modal visible={listing !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.cancel')} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border, paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
        <AppText variant="h3" style={styles.title}>
          {t('sellerTools.shareCardTitle')}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.subtitle}>
          {t('sellerTools.shareCardHint')}
        </AppText>
        {listing ? (
          <ScrollView horizontal={false} contentContainerStyle={styles.previewWrap}>
            <View style={styles.preview}>
              <ListingShareCard
                ref={cardRef}
                listing={listing}
                price={formatPrice(listing.price)}
                url={url}
                onPhotoReady={() => setPhotoReady(true)}
              />
            </View>
          </ScrollView>
        ) : null}
        {!photoReady ? <ActivityIndicator color={theme.colors.accent} style={styles.loading} /> : null}
        <Button
          label={t('sellerTools.shareImage')}
          onPress={() => void shareImage()}
          disabled={!photoReady}
          loading={busy}
        />
        <Button label={t('sellerTools.copyLink')} variant="secondary" onPress={() => void copyLink()} style={styles.secondary} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: '92%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md },
  previewWrap: { alignItems: 'center' },
  preview: {
    // Scale the full-size card down for the preview; capture still renders it at full size.
    transform: [{ scale: 0.8 }],
    marginVertical: -SHARE_CARD_HEIGHT * 0.1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  loading: { marginBottom: spacing.sm },
  secondary: { marginTop: spacing.sm },
});
