import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

interface PriceUpdateModalProps {
  listing: ListingWithPhotos | null;
  saving?: boolean;
  onCancel: () => void;
  onSave: (priceUzs: number) => void;
}

function groupDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Edit a listing's price (UZS). Saving also counts as confirming the property is available. */
export function PriceUpdateModal({ listing, saving = false, onCancel, onSave }: PriceUpdateModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { formatPrice } = useFormatPrice();
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(listing ? groupDigits(String(listing.price)) : '');
  }, [listing]);

  const next = Number(value.replace(/\D/g, ''));
  const valid = Number.isFinite(next) && next > 0 && next !== listing?.price;

  return (
    <Modal visible={listing !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel={t('common.cancel')} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border, paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <AppText variant="h3">{t('priceUpdate.title')}</AppText>
          {listing ? (
            <AppText variant="caption" color="secondary" style={styles.current}>
              {t('priceUpdate.current', { price: formatPrice(listing.price) })}
            </AppText>
          ) : null}
          <TextField
            label={t('listing.price')}
            value={value}
            onChangeText={(text) => setValue(groupDigits(text))}
            keyboardType="number-pad"
            autoFocus
            helperText={t('priceUpdate.hint')}
          />
          <Button label={t('common.save')} onPress={() => onSave(next)} disabled={!valid} loading={saving} />
          <Pressable style={styles.cancel} onPress={onCancel} disabled={saving}>
            <AppText variant="label" color="secondary">
              {t('common.cancel')}
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  current: { marginBottom: spacing.sm },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
});
