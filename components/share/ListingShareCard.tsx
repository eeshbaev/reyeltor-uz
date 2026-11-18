import { forwardRef } from 'react';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { QrCode } from '@/components/share/QrCode';
import { Text } from '@/components/ui/Text';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { getListingCategory } from '@/lib/listing';
import { LISTING_PHOTO_PLACEHOLDER_SOURCE, resolveListingPhotoSource } from '@/lib/listingPhotos';
import { getPhotoUrl } from '@/lib/supabase';
import type { ListingWithPhotos } from '@/types';

/** Logical size; captured at 3× → 1080×1350 (Instagram/Telegram-friendly 4:5). */
export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 450;

const BRAND_BLUE = fixedColors.blue;
const INK = fixedColors.slate900;

interface ListingShareCardProps {
  listing: ListingWithPhotos;
  price: string;
  url: string;
  onPhotoReady?: () => void;
}

/**
 * Branded advertising card for a listing. Fixed light design (independent of the
 * app theme) so the exported image looks the same everywhere.
 */
export const ListingShareCard = forwardRef<React.ComponentRef<typeof View>, ListingShareCardProps>(({ listing, price, url, onPhotoReady }, ref) => {
  const { t } = useTranslation();
  const photo = [...(listing.listing_photos ?? [])].sort((a, b) => a.order_index - b.order_index)[0];
  const transactionKey =
    listing.type === 'rent' ? 'filters.rent' : listing.type === 'lease' ? 'filters.lease' : 'filters.sale';
  const specs = [
    listing.rooms > 0 ? `${listing.rooms} ${t('common.rooms')}` : null,
    `${listing.area_m2} ${t('common.area')}`,
    listing.floor != null ? `${t('common.floor')} ${listing.floor}${listing.total_floors ? `/${listing.total_floors}` : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const category = t(`filters.${getListingCategory(listing)}`);

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.photoWrap}>
        <Image
          source={photo ? resolveListingPhotoSource(photo.storage_path, getPhotoUrl(photo.storage_path)) : LISTING_PHOTO_PLACEHOLDER_SOURCE}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          onLoad={onPhotoReady}
          onError={onPhotoReady}
        />
        <View style={styles.scrim} />
        <View style={styles.pillRow}>
          <Text style={styles.pill}>{t(transactionKey)}</Text>
          <Text style={[styles.pill, styles.pillLight]}>{category}</Text>
        </View>
        <View style={styles.headline}>
          <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit>
            {price}
          </Text>
          <Text style={styles.specs} numberOfLines={1}>
            {specs}
          </Text>
          <Text style={styles.district} numberOfLines={1}>
            📍 {listing.district}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.brand}>
          <Image
            source={require('../../assets/reyeltor-emblem-transparent.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>REYELTOR-UZ</Text>
            <Text style={styles.scanText}>{t('sellerTools.scanToView')}</Text>
          </View>
        </View>
        <QrCode value={url} size={92} color={INK} />
      </View>
    </View>
  );
});

ListingShareCard.displayName = 'ListingShareCard';

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    backgroundColor: fixedColors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  photoWrap: { flex: 1, backgroundColor: fixedColors.gray200 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,23,42,0.28)' },
  pillRow: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', gap: 6 },
  pill: {
    backgroundColor: BRAND_BLUE,
    color: fixedColors.white,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  pillLight: { backgroundColor: 'rgba(255,255,255,0.92)', color: INK },
  headline: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  price: { color: fixedColors.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  specs: { color: fixedColors.white, fontSize: 15, fontWeight: '600', marginTop: 4 },
  district: { color: 'rgba(255,255,255,0.92)', fontSize: 14, marginTop: 2 },
  footer: {
    height: 116,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logo: { width: 40, height: 40 },
  brandCopy: { flex: 1 },
  brandName: { color: BRAND_BLUE, fontWeight: '800', fontSize: 15, letterSpacing: 0.6 },
  scanText: { color: fixedColors.slate600, fontSize: 12, marginTop: 2 },
});
