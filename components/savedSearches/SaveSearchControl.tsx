import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SaveSearchButton } from '@/components/savedSearches/SaveSearchButton';
import { SaveSearchModal } from '@/components/savedSearches/SaveSearchModal';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { useAuth } from '@/lib/context/AuthContext';
import { useGuestFavoriteAuth } from '@/lib/context/GuestFavoriteAuthContext';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { hapticSuccess } from '@/lib/haptics';
import { useSavedSearches } from '@/lib/hooks/useSavedSearches';
import { requestSavedSearchNotificationPermission } from '@/lib/notifications';
import { SAVE_SEARCH_HINT_KEY } from '@/lib/purposes';
import { MAX_SAVED_SEARCHES, SavedSearchError, savedFiltersKey } from '@/lib/savedSearches';
import type { ListingFilters } from '@/types';

interface SaveSearchControlProps {
  filters: ListingFilters;
}

/** Bell button on the map: saves the current filters as a search with optional alerts. */
export function SaveSearchControl({ filters }: SaveSearchControlProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const { openGuestSignIn } = useGuestFavoriteAuth();
  const { searches, create } = useSavedSearches();
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // One-time hint after onboarding prefilled the first search.
  useEffect(() => {
    AsyncStorage.getItem(SAVE_SEARCH_HINT_KEY)
      .then((value) => setShowHint(value === '1'))
      .catch(() => undefined);
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    void AsyncStorage.removeItem(SAVE_SEARCH_HINT_KEY);
  }, []);

  const currentKey = useMemo(() => savedFiltersKey(filters), [filters]);
  const existing = useMemo(
    () => searches.find((search) => savedFiltersKey(search.filters) === currentKey) ?? null,
    [currentKey, searches],
  );

  const openSearches = useCallback(() => {
    router.push({ pathname: '/(tabs)/favorites', params: { tab: 'searches' } });
  }, [router]);

  const handlePress = useCallback(() => {
    dismissHint();
    if (!session?.user?.id) {
      openGuestSignIn();
      return;
    }
    if (existing) {
      Alert.alert(t('savedSearches.alreadySaved'), existing.name, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('savedSearches.manage'), onPress: openSearches },
      ]);
      return;
    }
    if (searches.length >= MAX_SAVED_SEARCHES) {
      Alert.alert(t('savedSearches.limitTitle'), t('savedSearches.limitBody', { max: MAX_SAVED_SEARCHES }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('savedSearches.manage'), onPress: openSearches },
      ]);
      return;
    }
    setOpen(true);
  }, [dismissHint, existing, openGuestSignIn, openSearches, searches.length, session?.user?.id, t]);

  const handleSave = useCallback(
    async ({ name, notifyEnabled }: { name: string; notifyEnabled: boolean }) => {
      const userId = session?.user?.id;
      if (!userId) return;
      try {
        await create.mutateAsync({ name, filters, notifyEnabled });
      } catch (error) {
        const limit = error instanceof SavedSearchError && error.kind === 'limit';
        Alert.alert(
          limit ? t('savedSearches.limitTitle') : t('common.error'),
          limit ? t('savedSearches.limitBody', { max: MAX_SAVED_SEARCHES }) : undefined,
        );
        return;
      }

      setOpen(false);
      hapticSuccess();
      const permitted = notifyEnabled ? await requestSavedSearchNotificationPermission(userId) : true;
      Alert.alert(
        t('savedSearches.savedTitle'),
        notifyEnabled && permitted ? t('savedSearches.savedBodyNotify') : t('savedSearches.savedBody'),
        [
          { text: t('common.ok'), style: 'cancel' },
          { text: t('savedSearches.manage'), onPress: openSearches },
        ],
      );
    },
    [create, filters, openSearches, session?.user?.id, t],
  );

  return (
    <View>
      <SaveSearchButton saved={Boolean(existing)} onPress={handlePress} />
      {showHint && !existing ? (
        <Pressable style={styles.hint} onPress={dismissHint} accessibilityRole="button">
          <FrostedView style={styles.hintInner}>
            <AppText variant="caption">{t('savedSearches.hint')}</AppText>
          </FrostedView>
        </Pressable>
      ) : null}
      <SaveSearchModal
        visible={open}
        filters={filters}
        saving={create.isPending}
        onCancel={() => setOpen(false)}
        onSave={(input) => void handleSave(input)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { position: 'absolute', right: 58, top: 4, width: 220 },
  hintInner: { padding: spacing.sm, borderRadius: radius.md },
});
