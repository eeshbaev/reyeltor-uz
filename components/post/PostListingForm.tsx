import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { PostFormChip } from '@/components/post/PostFormChip';
import { PostFormChipRow } from '@/components/post/PostFormChipRow';
import { PostFormField } from '@/components/post/PostFormField';
import { PostFormHeader } from '@/components/post/PostFormHeader';
import { PostFormSection } from '@/components/post/PostFormSection';
import { PostFormSkeleton } from '@/components/post/PostFormSkeleton';
import { PostInsufficientCoins } from '@/components/post/PostInsufficientCoins';
import { PostLocationSection } from '@/components/post/PostLocationSection';
import { PostPhotoPicker } from '@/components/post/PostPhotoPicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { getCoinCost } from '@/lib/coins';
import { TASHKENT_DISTRICTS } from '@/lib/constants';
import {
  COMMERCIAL_PROPERTY_TYPES,
  PROPERTY_LEVELS,
  PROPERTY_VIEWS,
  RESIDENTIAL_PROPERTY_TYPES,
} from '@/lib/constants/filterOptions';
import { useAuth } from '@/lib/context/AuthContext';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { usePin } from '@/lib/context/PinContext';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { spacing } from '@/lib/design/spacing';
import { showActionError } from '@/lib/error/actionError';
import { hapticSuccess } from '@/lib/haptics';
import { useCurrentLocation } from '@/lib/hooks/useCurrentLocation';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { useListingLocationActions } from '@/lib/hooks/useListingLocation';
import { fetchActiveListingCount } from '@/lib/hooks/useListings';
import { useLocationSearch } from '@/lib/hooks/useLocationSearch';
import { translatePropertyLevel, translatePropertyType, translatePropertyView } from '@/lib/i18n/filterLabels';
import { enrichListing } from '@/lib/listing';
import { findDistrictAtPoint, getDistrictCenter } from '@/lib/map/districtBoundaries';
import { reverseGeocode } from '@/lib/map/reverseGeocode';
import { requestNotificationPermission, scheduleListingNotifications } from '@/lib/notifications';
import { serverErrorCode } from '@/lib/serverErrors';
import { uploadLocalImage } from '@/lib/storage/uploadLocalImage';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { Listing, ListingCategory, ListingType, ListingWithPhotos, PropertyLevel, PropertyView } from '@/types';

interface PostFormState {
  category: ListingCategory;
  type: ListingType;
  property_type: string;
  bathrooms: number | null;
  year_built: string;
  property_views: PropertyView[];
  level: PropertyLevel | null;
  price: string;
  rooms: number;
  area_m2: string;
  floor: string;
  total_floors: string;
  district: string;
  description: string;
  lat: number;
  lng: number;
}

interface PostListingFormProps {
  bottomPadding?: number;
}

export function PostListingForm({ bottomPadding = spacing.xl }: PostListingFormProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const { refetch, upsertListing } = useListingsCache();
  const { formatPrice } = useFormatPrice();
  const categoryColors = useMemo(
    () => getCategoryColors(theme.scheme, 'residential'),
    [theme.scheme],
  );
  const [cost, setCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [locationQuery, setLocationQuery] = useState<string>(TASHKENT_DISTRICTS[0]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(`district-${TASHKENT_DISTRICTS[0]}`);
  const [pinExact, setPinExact] = useState(false);
  const { lat, lng, addressLabel, setPin } = usePin();
  const { suggestions: locationSuggestions, loading: locationSearching } = useLocationSearch(
    locationQuery,
    i18n.language,
    locationQuery.trim().length > 0,
  );
  const [form, setForm] = useState<PostFormState>({
    category: 'residential',
    type: 'rent',
    property_type: 'residential',
    bathrooms: 1,
    year_built: '',
    property_views: [],
    level: null,
    price: '',
    rooms: 2,
    area_m2: '',
    floor: '',
    total_floors: '',
    district: TASHKENT_DISTRICTS[0],
    description: '',
    lat,
    lng,
  });

  const activeCategoryColors = getCategoryColors(theme.scheme, form.category);

  const updateFormCoords = useCallback((nextLat: number, nextLng: number, nextDistrict?: string) => {
    setForm((prev) => ({
      ...prev,
      lat: nextLat,
      lng: nextLng,
      ...(nextDistrict ? { district: nextDistrict } : {}),
    }));
  }, []);

  const { selectSuggestion, selectDistrictChip, applyExactCoords } = useListingLocationActions({
    lat,
    lng,
    setPin,
    setDistrict: (name) => setForm((prev) => ({ ...prev, district: name })),
    setLocationQuery,
    setPinExact,
    setSelectedSuggestionId,
    updateFormCoords,
  });

  const { requestCurrentLocation, loading: gpsLoading } = useCurrentLocation();

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      const coords = await requestCurrentLocation();
      if (!coords) return;
      const geocoded = await reverseGeocode(coords.lat, coords.lng, i18n.language);
      applyExactCoords(
        coords.lat,
        coords.lng,
        geocoded?.label ?? t('listing.currentLocation'),
      );
    } catch (error) {
      console.error('Failed to get current location:', error);
      Alert.alert(t('common.error'), t('listing.locationError'));
    }
  }, [applyExactCoords, i18n.language, requestCurrentLocation, t]);

  useEffect(() => {
    const detected = findDistrictAtPoint(lng, lat);
    const center = getDistrictCenter(detected ?? form.district);
    if (center) {
      setPinExact(Math.abs(center.lat - lat) > 0.0008 || Math.abs(center.lng - lng) > 0.0008);
    }
    setForm((prev) => ({
      ...prev,
      lat,
      lng,
      ...(detected ? { district: detected } : {}),
    }));
    if (addressLabel) {
      setLocationQuery(addressLabel);
      setSelectedSuggestionId(null);
    }
  }, [lat, lng, addressLabel, form.district]);

  const openPinPicker = () => {
    router.push({
      pathname: '/post/pin-picker',
      params: { lat: String(form.lat), lng: String(form.lng), district: form.district },
    });
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    fetchActiveListingCount(session.user.id)
      .then((count) => {
        setCost(getCoinCost(count));
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch active listing count:', error);
        setCost(getCoinCost(0)); // Default to first listing cost
        setLoading(false);
      });
  }, [session?.user?.id]);

  const canAfford = (profile?.coin_balance ?? 0) >= cost;

  const publishDisabledReason = useMemo(() => {
    if (photos.length === 0) return t('listing.publishHintPhotos');
    if (!form.price.trim()) return t('listing.publishHintPrice');
    if (!form.area_m2.trim()) return t('listing.publishHintArea');
    if (!form.district.trim()) return t('listing.publishHintDistrict');
    return undefined;
  }, [form.area_m2, form.district, form.price, photos.length, t]);

  const canSubmit = !publishDisabledReason && canAfford;

  const listingFields = () => ({
    type: form.type,
    category: form.category,
    property_type: form.property_type,
    bathrooms: form.bathrooms,
    year_built: form.year_built ? Number(form.year_built) : null,
    property_views: form.property_views,
    level: form.level,
    price: Number(form.price),
    rooms: form.category === 'commercial' ? 0 : form.rooms,
    area_m2: Number(form.area_m2),
    floor: form.floor ? Number(form.floor) : null,
    total_floors: form.total_floors ? Number(form.total_floors) : null,
    district: form.district,
    lat: form.lat,
    lng: form.lng,
    description: form.description || null,
  });

  /** Uploads picked photos to a listing, numbering them after any photos it already has. */
  const uploadPhotos = async (listingId: string, startIndex: number) => {
    const uploaded: NonNullable<ListingWithPhotos['listing_photos']> = [];
    for (let i = 0; i < photos.length; i++) {
      const orderIndex = startIndex + i;
      const path = `${listingId}/${Date.now()}_${orderIndex}.jpg`;
      const upload = await uploadLocalImage(path, photos[i].uri, 'image/jpeg');
      if (!upload.ok) {
        console.warn('Listing photo upload failed:', upload.message);
        continue;
      }
      const { error: photoError } = await supabase
        .from('listing_photos')
        .insert({ listing_id: listingId, storage_path: path, order_index: orderIndex });
      if (photoError) {
        // Continue with other photos rather than failing the whole upload.
        console.error('Failed to save photo metadata:', photoError);
        continue;
      }
      uploaded.push({ id: `${listingId}-${orderIndex}`, listing_id: listingId, storage_path: path, order_index: orderIndex });
    }
    return uploaded;
  };

  /** Server-side check against the user's own active listings. Never blocks publishing. */
  const findLikelyDuplicate = async (fields: ReturnType<typeof listingFields>) => {
    try {
      const { data, error } = await supabase.rpc('find_similar_own_listings', {
        p_type: fields.type,
        p_category: fields.category,
        p_property_type: fields.property_type || null,
        p_price: fields.price,
        p_area_m2: fields.area_m2,
        p_lat: fields.lat,
        p_lng: fields.lng,
        p_rooms: fields.rooms,
      });
      if (error) {
        console.warn('Duplicate check unavailable:', error.message);
        return null;
      }
      return ((data ?? []) as Array<{ id: string; price: number; area_m2: number; district: string }>)[0] ?? null;
    } catch (error) {
      console.warn('Duplicate check failed:', error);
      return null;
    }
  };

  const askAboutDuplicate = (duplicate: { price: number; area_m2: number; district: string }) =>
    new Promise<'update' | 'new' | 'cancel'>((resolve) => {
      Alert.alert(
        t('listing.duplicateTitle'),
        t('listing.duplicateBody', {
          district: duplicate.district,
          area: duplicate.area_m2,
          price: formatPrice(duplicate.price),
        }),
        [
          { text: t('listing.duplicateUpdate'), onPress: () => resolve('update') },
          { text: t('listing.duplicatePublishNew'), onPress: () => resolve('new') },
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve('cancel') },
        ],
        { cancelable: true, onDismiss: () => resolve('cancel') },
      );
    });

  const finishPublish = async (
    listing: ListingWithPhotos,
    photosForCache: NonNullable<ListingWithPhotos['listing_photos']>,
    isFirstListing: boolean,
  ) => {
    if (!session?.user?.id) return;
    await refreshProfile();
    if (isFirstListing) {
      await requestNotificationPermission(session.user.id);
      const { processReferralFirstPost } = await import('@/lib/growth/referral');
      void processReferralFirstPost(session.user.id);
    }

    const { data: activeListings } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active');
    await scheduleListingNotifications((activeListings ?? []) as Listing[], i18n.language);

    setSubmitting(false);
    hapticSuccess();

    upsertListing(enrichListing({ ...listing, status: 'active', listing_photos: photosForCache }));
    void refetch();

    router.replace({
      pathname: '/(tabs)/map',
      params: {
        postedListingId: listing.id,
        postedLat: String(listing.lat),
        postedLng: String(listing.lng),
        postedCategory: listing.category,
        postedType: listing.type,
        postedDistrict: listing.district,
        postedFirst: isFirstListing ? '1' : undefined,
      },
    });
  };

  const updateExistingListing = async (listingId: string, fields: ReturnType<typeof listingFields>) => {
    // Content edits also renew the listing's 90-day expiry (database trigger on_listing_edited).
    const { data: updated, error } = await supabase
      .from('listings')
      .update(fields)
      .eq('id', listingId)
      .select('*, listing_photos(*)')
      .single();

    if (error || !updated) {
      setSubmitting(false);
      showActionError(t, 'updateListing', error);
      return;
    }

    const existingPhotos = ((updated as ListingWithPhotos).listing_photos ?? []).slice();
    const added = await uploadPhotos(listingId, existingPhotos.length);
    // Existing photos are never removed, so a failed upload can't leave the listing worse off —
    // but the seller must know which new photos did not make it.
    const failed = photos.length - added.length;
    Alert.alert(
      t('listing.duplicateUpdated'),
      failed > 0 ? t('listing.photosPartialFailed', { failed, total: photos.length }) : undefined,
    );
    await finishPublish(updated as ListingWithPhotos, [...existingPhotos, ...added], false);
  };

  const handleSubmit = async () => {
    if (!session?.user?.id || !canSubmit) return;
    setSubmitting(true);

    const fields = listingFields();
    const duplicate = await findLikelyDuplicate(fields);
    if (duplicate) {
      const choice = await askAboutDuplicate(duplicate);
      if (choice === 'cancel') {
        setSubmitting(false);
        return;
      }
      if (choice === 'update') {
        await updateExistingListing(duplicate.id, fields);
        return;
      }
    }

    const priorActiveCount = await fetchActiveListingCount(session.user.id);
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({ user_id: session.user.id, ...fields })
      .select()
      .single();

    // Coins are charged by the database in the same transaction as the insert
    // (supabase/patch-saved-searches-v1.sql), so a listing is never created without payment.
    if (error || !listing) {
      setSubmitting(false);
      const code = serverErrorCode(error);
      if (code === 'insufficient_coins') {
        await refreshProfile();
        Alert.alert(t('listing.notEnoughCoins'), t('listing.earnMore'));
      } else if (code === 'listing_rate_limited') {
        Alert.alert(t('actionErrors.publishListing.title'), t('listing.rateLimited'));
      } else {
        showActionError(t, 'publishListing', error);
      }
      return;
    }

    const uploadedPhotos = await uploadPhotos(listing.id, 0);
    const failedUploads = photos.length - uploadedPhotos.length;
    if (failedUploads > 0) {
      Alert.alert(t('common.error'), t('listing.photosPartialFailed', { failed: failedUploads, total: photos.length }));
    }
    await finishPublish(listing as ListingWithPhotos, uploadedPhotos, priorActiveCount === 0);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <PostFormSkeleton />
      </View>
    );
  }

  if (!canAfford) {
    return <PostInsufficientCoins balance={profile?.coin_balance ?? 0} />;
  }

  const transactionOptions: ListingType[] =
    form.category === 'residential' ? ['rent', 'buy'] : ['buy', 'lease'];
  const propertyTypes =
    form.category === 'residential'
      ? RESIDENTIAL_PROPERTY_TYPES.filter((p) => p !== 'any')
      : COMMERCIAL_PROPERTY_TYPES.filter((p) => p !== 'any');

  const updateForm = (patch: Partial<PostFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <PostFormHeader />

      <PostFormSection title={t('listing.category')}>
        <PostFormChipRow>
          {(['residential', 'commercial'] as ListingCategory[]).map((category) => {
            const colors = getCategoryColors(theme.scheme, category);
            return (
              <PostFormChip
                key={category}
                label={t(`filters.${category}`)}
                selected={form.category === category}
                activeColor={colors.main}
                activeTextColor={colors.onMain}
                onPress={() =>
                  updateForm({
                    category,
                    type: category === 'residential' ? 'rent' : 'lease',
                    property_type: category === 'residential' ? 'residential' : 'office',
                    rooms: category === 'residential' ? form.rooms || 2 : 0,
                  })
                }
              />
            );
          })}
        </PostFormChipRow>

        <AppText variant="caption" color="secondary" style={styles.fieldLabel}>
          {t('filters.transaction')}
        </AppText>
        <PostFormChipRow>
          {transactionOptions.map((type) => (
            <PostFormChip
              key={type}
              label={t(type === 'rent' ? 'filters.rent' : type === 'lease' ? 'filters.lease' : 'filters.sale')}
              selected={form.type === type}
              activeColor={activeCategoryColors.main}
              activeTextColor={activeCategoryColors.onMain}
              onPress={() => updateForm({ type })}
            />
          ))}
        </PostFormChipRow>

        <AppText variant="caption" color="secondary" style={styles.fieldLabel}>
          {t('filters.propertyType')}
        </AppText>
        <PostFormChipRow horizontal>
          {propertyTypes.map((property_type) => (
            <PostFormChip
              key={property_type}
              label={translatePropertyType(t, form.category, property_type)}
              selected={form.property_type === property_type}
              activeColor={activeCategoryColors.main}
              activeTextColor={activeCategoryColors.onMain}
              onPress={() => updateForm({ property_type })}
            />
          ))}
        </PostFormChipRow>
      </PostFormSection>

      <PostFormSection title={t('listing.photos')}>
        <PostPhotoPicker photos={photos} onChange={setPhotos} />
      </PostFormSection>

      <PostFormSection title={t('listing.propertyInfo')}>
        <PostFormField
          label={t('listing.price')}
          placeholder={t('listing.pricePlaceholder')}
          keyboardType="numeric"
          value={form.price}
          onChangeText={(price) => updateForm({ price })}
        />

        {form.category === 'residential' ? (
          <>
            <AppText variant="caption" color="secondary" style={styles.fieldLabel}>
              {t('filters.rooms')}
            </AppText>
            <PostFormChipRow horizontal>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((room) => (
                <PostFormChip
                  key={room}
                  label={String(room)}
                  compact
                  selected={form.rooms === room}
                  activeColor={categoryColors.main}
                  activeTextColor={categoryColors.onMain}
                  onPress={() => updateForm({ rooms: room })}
                />
              ))}
            </PostFormChipRow>
          </>
        ) : null}

        <PostFormField
          label={t('common.area')}
          placeholder="m²"
          keyboardType="numeric"
          value={form.area_m2}
          onChangeText={(area_m2) => updateForm({ area_m2 })}
        />

        <View style={styles.fieldGrid}>
          <PostFormField
            half
            optional
            label={t('filters.bathrooms')}
            keyboardType="numeric"
            value={form.bathrooms != null ? String(form.bathrooms) : ''}
            onChangeText={(v) => updateForm({ bathrooms: v ? Number(v) : null })}
          />
          <PostFormField
            half
            optional
            label={t('filters.yearBuilt')}
            keyboardType="numeric"
            value={form.year_built}
            onChangeText={(year_built) => updateForm({ year_built })}
          />
          <PostFormField
            half
            optional
            label={t('common.floor')}
            keyboardType="numeric"
            value={form.floor}
            onChangeText={(floor) => updateForm({ floor })}
          />
          <PostFormField
            half
            optional
            label={t('listing.totalFloors')}
            keyboardType="numeric"
            value={form.total_floors}
            onChangeText={(total_floors) => updateForm({ total_floors })}
          />
        </View>
      </PostFormSection>

      <PostFormSection title={t('listing.buildingDetails')}>
        <AppText variant="caption" color="secondary" style={styles.fieldLabel}>
          {t('filters.level')}
        </AppText>
        <PostFormChipRow horizontal>
          {PROPERTY_LEVELS.map((level) => (
            <PostFormChip
              key={level}
              label={translatePropertyLevel(t, level)}
              selected={form.level === level}
              activeColor={activeCategoryColors.main}
              activeTextColor={activeCategoryColors.onMain}
              onPress={() => updateForm({ level: form.level === level ? null : level })}
            />
          ))}
        </PostFormChipRow>

        <AppText variant="caption" color="secondary" style={styles.fieldLabel}>
          {t('filters.viewFromProperty')}
        </AppText>
        <PostFormChipRow>
          {PROPERTY_VIEWS.map((view) => (
            <PostFormChip
              key={view}
              label={translatePropertyView(t, view)}
              selected={form.property_views.includes(view)}
              activeColor={activeCategoryColors.main}
              activeTextColor={activeCategoryColors.onMain}
              onPress={() => {
                const property_views = form.property_views.includes(view)
                  ? form.property_views.filter((v) => v !== view)
                  : [...form.property_views, view];
                updateForm({ property_views });
              }}
            />
          ))}
        </PostFormChipRow>
      </PostFormSection>

      <PostLocationSection
        district={form.district}
        lat={form.lat}
        lng={form.lng}
        pinExact={pinExact}
        addressLabel={addressLabel}
        locationQuery={locationQuery}
        onLocationQueryChange={(value) => {
          setLocationQuery(value);
          setSelectedSuggestionId(null);
        }}
        locationSuggestions={locationSuggestions}
        locationSearching={locationSearching}
        selectedSuggestionId={selectedSuggestionId}
        onSelectSuggestion={selectSuggestion}
        onSelectDistrict={selectDistrictChip}
        onOpenPinPicker={openPinPicker}
        onUseCurrentLocation={handleUseCurrentLocation}
        gpsLoading={gpsLoading}
      />

      <PostFormSection title={t('listing.description')}>
        <PostFormField
          label=""
          placeholder={t('listing.descriptionPlaceholder')}
          multiline
          value={form.description}
          onChangeText={(description) => updateForm({ description })}
          style={styles.multiline}
        />
      </PostFormSection>

      <Button
        label={t('common.publish')}
        onPress={handleSubmit}
        loading={submitting}
        disabled={!canSubmit}
        disabledReason={publishDisabledReason}
        style={styles.submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { marginTop: spacing.sm, marginBottom: spacing.sm, fontWeight: '600' },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  submit: { marginTop: spacing.sm },
});
