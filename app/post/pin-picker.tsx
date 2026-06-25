import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { usePin } from '@/lib/context/PinContext';
import { TASHKENT_CENTER } from '@/lib/constants';
import { spacing } from '@/lib/design/spacing';
import { getMapBackgroundTileUrl } from '@/lib/mapTiles';
import { useTheme } from '@/lib/theme';

export default function PinPickerScreen() {
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { setPin: savePin } = usePin();
  const [pin, setPin] = useState({
    lat: Number(lat ?? TASHKENT_CENTER.latitude),
    lng: Number(lng ?? TASHKENT_CENTER.longitude),
  });

  const tileUrl = getMapBackgroundTileUrl(pin.lat, pin.lng, 14);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Pressable
        style={styles.mapArea}
        onPress={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          setPin({
            lat: TASHKENT_CENTER.latitude + (0.5 - locationY / 400) * 0.1,
            lng: TASHKENT_CENTER.longitude + (locationX / 400 - 0.5) * 0.1,
          });
        }}
      >
        <View style={styles.map}>
          <ImageBackground source={{ uri: tileUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[styles.pin, { backgroundColor: theme.colors.danger }]} />
        </View>
      </Pressable>
      <View style={styles.footer}>
        <Button
          label={t('common.save')}
          onPress={() => {
            savePin(pin.lat, pin.lng);
            router.back();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapArea: { flex: 1, margin: spacing.md, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  pin: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: '#fff' },
  footer: { padding: spacing.md },
});
