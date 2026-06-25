import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScrollView } from '@/components/ui/GestureScrollView';
import * as ImagePicker from 'expo-image-picker';
import { CostDisplay } from '@/components/coins/CostDisplay';
import { TASHKENT_DISTRICTS } from '@/lib/constants';
import {
  COMMERCIAL_PROPERTY_TYPES,
  PROPERTY_LEVELS,
  PROPERTY_VIEWS,
  RESIDENTIAL_PROPERTY_TYPES,
} from '@/lib/constants/filterOptions';
import { translatePropertyLevel, translatePropertyType, translatePropertyView } from '@/lib/i18n/filterLabels';
import { getCoinCost } from '@/lib/coins';
import { useAuth } from '@/lib/context/AuthContext';
import { usePin } from '@/lib/context/PinContext';
import { fetchActiveListingCount } from '@/lib/hooks/useListings';
import { requestNotificationPermission, scheduleListingNotifications } from '@/lib/notifications';
import { LISTINGS_STORAGE_BUCKET, supabase } from '@/lib/supabase';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { Listing, ListingCategory, ListingType, PropertyLevel, PropertyView } from '@/types';

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
  const { t } = useTranslation();
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const [cost, setCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const { lat, lng } = usePin();
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

  useEffect(() => {
    setForm((prev) => ({ ...prev, lat, lng }));
  }, [lat, lng]);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    fetchActiveListingCount(session.user.id).then((count) => {
      setCost(getCoinCost(count));
      setLoading(false);
    });
  }, [session?.user?.id]);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - photos.length,
      quality: 0.8,
    });
    if (!result.canceled) setPhotos((prev) => [...prev, ...result.assets].slice(0, 10));
  };

  const canAfford = (profile?.coin_balance ?? 0) >= cost;

  const handleSubmit = async () => {
    if (!session?.user?.id || !canAfford) return;
    setSubmitting(true);

    const priorActiveCount = await fetchActiveListingCount(session.user.id);

    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        user_id: session.user.id,
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
      })
      .select()
      .single();

    if (error || !listing) {
      setSubmitting(false);
      Alert.alert(t('common.error'));
      return;
    }

    if (cost > 0) {
      await supabase.from('users').update({ coin_balance: (profile?.coin_balance ?? 0) - cost }).eq('id', session.user.id);
      await supabase.from('coin_transactions').insert({
        user_id: session.user.id,
        amount: -cost,
        type: 'post_cost',
        listing_id: listing.id,
      });
    }

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const path = `${listing.id}/${Date.now()}_${i}.jpg`;
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      await supabase.storage.from(LISTINGS_STORAGE_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
      await supabase.from('listing_photos').insert({ listing_id: listing.id, storage_path: path, order_index: i });
    }

    await refreshProfile();

    if (priorActiveCount === 0) {
      await requestNotificationPermission();
    }

    const { data: activeListings } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active');
    await scheduleListingNotifications((activeListings ?? []) as Listing[]);

    setSubmitting(false);
    router.push(`/listing/${listing.id}`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!canAfford) {
    return (
      <View style={styles.centered}>
        <Text style={styles.blockedTitle}>{t('listing.notEnoughCoins')}</Text>
        <Text style={styles.blockedSubtitle}>{t('listing.earnMore')}</Text>
        <Text style={styles.balance}>🪙 {profile?.coin_balance ?? 0}</Text>
        <Pressable style={styles.button} onPress={() => router.push('/profile/coins')}>
          <Text style={styles.buttonText}>{t('profile.coins')}</Text>
        </Pressable>
      </View>
    );
  }

  const transactionOptions: ListingType[] =
    form.category === 'residential' ? ['rent', 'buy'] : ['buy', 'lease'];

  const propertyTypes =
    form.category === 'residential'
      ? RESIDENTIAL_PROPERTY_TYPES.filter((p) => p !== 'any')
      : COMMERCIAL_PROPERTY_TYPES.filter((p) => p !== 'any');

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <CostDisplay cost={cost} />

      <Text style={styles.label}>{t('listing.category')}</Text>
      <View style={styles.row}>
        {(['residential', 'commercial'] as ListingCategory[]).map((category) => (
          <Pressable
            key={category}
            style={[styles.pill, form.category === category && styles.pillActive]}
            onPress={() =>
              setForm({
                ...form,
                category,
                type: category === 'residential' ? 'rent' : 'lease',
                property_type: category === 'residential' ? 'residential' : 'office',
                rooms: category === 'residential' ? form.rooms || 2 : 0,
              })
            }
          >
            <Text style={[styles.pillText, form.category === category && styles.pillTextActive]}>
              {t(`filters.${category}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('filters.transaction')}</Text>
      <View style={styles.row}>
        {transactionOptions.map((type) => (
          <Pressable
            key={type}
            style={[styles.pill, form.type === type && styles.pillActive]}
            onPress={() => setForm({ ...form, type })}
          >
            <Text style={[styles.pillText, form.type === type && styles.pillTextActive]}>
              {t(type === 'rent' ? 'filters.rent' : type === 'lease' ? 'filters.lease' : 'filters.sale')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('filters.propertyType')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
        {propertyTypes.map((property_type) => (
          <Pressable
            key={property_type}
            style={[styles.districtPill, form.property_type === property_type && styles.pillActive]}
            onPress={() => setForm({ ...form, property_type })}
          >
            <Text style={[styles.districtText, form.property_type === property_type && styles.pillTextActive]}>
              {translatePropertyType(t, form.category, property_type)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.photoBtn} onPress={pickPhotos}>
        <Text style={styles.label}>{t('listing.addPhotos')}</Text>
        <View style={styles.photoRow}>
          {photos.map((p) => (
            <Image key={p.uri} source={{ uri: p.uri }} style={styles.thumb} />
          ))}
        </View>
      </Pressable>

      <TextInput style={styles.input} placeholder={t('listing.price')} keyboardType="numeric" value={form.price} onChangeText={(price) => setForm({ ...form, price })} />

      {form.category === 'residential' ? (
        <View style={styles.roomRow}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((room) => (
            <Pressable key={room} style={[styles.roomPill, form.rooms === room && styles.pillActive]} onPress={() => setForm({ ...form, rooms: room })}>
              <Text style={[styles.pillText, form.rooms === room && styles.pillTextActive]}>{room}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextInput style={styles.input} placeholder={t('common.area')} keyboardType="numeric" value={form.area_m2} onChangeText={(area_m2) => setForm({ ...form, area_m2 })} />
      <TextInput
        style={styles.input}
        placeholder={`${t('filters.bathrooms')} (${t('listing.optional')})`}
        keyboardType="numeric"
        value={form.bathrooms != null ? String(form.bathrooms) : ''}
        onChangeText={(v) => setForm({ ...form, bathrooms: v ? Number(v) : null })}
      />
      <TextInput
        style={styles.input}
        placeholder={`${t('filters.yearBuilt')} (${t('listing.optional')})`}
        keyboardType="numeric"
        value={form.year_built}
        onChangeText={(year_built) => setForm({ ...form, year_built })}
      />
      <TextInput style={styles.input} placeholder={`${t('common.floor')} (${t('listing.optional')})`} keyboardType="numeric" value={form.floor} onChangeText={(floor) => setForm({ ...form, floor })} />
      <TextInput style={styles.input} placeholder={`${t('listing.totalFloors')} (${t('listing.optional')})`} keyboardType="numeric" value={form.total_floors} onChangeText={(total_floors) => setForm({ ...form, total_floors })} />

      <Text style={styles.label}>{t('filters.level')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
        {PROPERTY_LEVELS.map((level) => (
          <Pressable
            key={level}
            style={[styles.districtPill, form.level === level && styles.pillActive]}
            onPress={() => setForm({ ...form, level: form.level === level ? null : level })}
          >
            <Text style={[styles.districtText, form.level === level && styles.pillTextActive]}>
              {translatePropertyLevel(t, level)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>{t('filters.viewFromProperty')}</Text>
      <View style={styles.row}>
        {PROPERTY_VIEWS.map((view) => (
          <Pressable
            key={view}
            style={[styles.pill, form.property_views.includes(view) && styles.pillActive]}
            onPress={() => {
              const property_views = form.property_views.includes(view)
                ? form.property_views.filter((v) => v !== view)
                : [...form.property_views, view];
              setForm({ ...form, property_views });
            }}
          >
            <Text style={[styles.pillText, form.property_views.includes(view) && styles.pillTextActive]}>
              {translatePropertyView(t, view)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
        {TASHKENT_DISTRICTS.map((district) => (
          <Pressable key={district} style={[styles.districtPill, form.district === district && styles.pillActive]} onPress={() => setForm({ ...form, district })}>
            <Text style={[styles.districtText, form.district === district && styles.pillTextActive]}>{district}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t('listing.description')}
        multiline
        value={form.description}
        onChangeText={(description) => setForm({ ...form, description })}
      />

      <Pressable style={styles.pinBtn} onPress={() => router.push({ pathname: '/post/pin-picker', params: { lat: String(form.lat), lng: String(form.lng) } })}>
        <Text style={styles.pinText}>{t('listing.changePin')}</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.buttonText}>{t('common.submit')}</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
  blockedTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.error },
  blockedSubtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  balance: { fontSize: fontSize.xl, marginVertical: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontWeight: '600', color: colors.text },
  pillTextActive: { color: colors.surface },
  photoBtn: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  roomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  roomPill: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  districtScroll: { marginBottom: spacing.sm },
  districtPill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginRight: spacing.xs },
  districtText: { fontSize: fontSize.xs },
  pinBtn: { padding: spacing.md, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, alignItems: 'center', marginBottom: spacing.md },
  pinText: { color: colors.primary, fontWeight: '600' },
  button: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: colors.surface, fontWeight: '700' },
});
