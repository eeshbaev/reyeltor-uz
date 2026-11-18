import { type ReactNode, useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { SavedSearchCard } from '@/components/savedSearches/SavedSearchCard';
import { SaveSearchModal } from '@/components/savedSearches/SaveSearchModal';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { showActionError } from '@/lib/error/actionError';
import { useSavedSearches } from '@/lib/hooks/useSavedSearches';
import { requestSavedSearchNotificationPermission } from '@/lib/notifications';
import { MAX_SAVED_SEARCHES, SavedSearchError, savedFiltersKey, type SavedSearch } from '@/lib/savedSearches';
import { useTheme } from '@/lib/theme';

interface SavedSearchesPanelProps {
  header: ReactNode;
  bottomPadding: number;
}

export function SavedSearchesPanel({ header, bottomPadding }: SavedSearchesPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { filters: mapFilters, setFilters } = useListingsCache();
  const { userId, searches, lastSearch, loading, refetch, update, remove, keepLast, markSeen } = useSavedSearches();
  const [renaming, setRenaming] = useState<SavedSearch | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const showOnMap = useCallback(
    (search: SavedSearch) => {
      setFilters(search.filters);
      if (search.newMatches > 0) markSeen.mutate(search.id);
      router.push('/(tabs)/map');
    },
    [markSeen, router, setFilters],
  );

  const toggleNotify = useCallback(
    (search: SavedSearch, enabled: boolean) => {
      update.mutate(
        { id: search.id, notifyEnabled: enabled },
        { onError: (error) => showActionError(t, 'savedSearch', error) },
      );
      if (enabled && userId) void requestSavedSearchNotificationPermission(userId);
    },
    [t, update, userId],
  );

  const replaceWithMapFilters = useCallback(
    (search: SavedSearch) => {
      if (savedFiltersKey(mapFilters) === savedFiltersKey(search.filters)) {
        Alert.alert(t('savedSearches.sameFiltersTitle'), t('savedSearches.sameFiltersBody'));
        return;
      }
      Alert.alert(t('savedSearches.updateFiltersTitle'), t('savedSearches.updateFiltersBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('savedSearches.updateFiltersConfirm'),
          onPress: () =>
            update.mutate({ id: search.id, filters: mapFilters }, { onError: (error) => showActionError(t, 'savedSearch', error) }),
        },
      ]);
    },
    [mapFilters, t, update],
  );

  const confirmDelete = useCallback(
    (search: SavedSearch) => {
      Alert.alert(t('savedSearches.deleteTitle'), search.name, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('savedSearches.delete'),
          style: 'destructive',
          onPress: () => remove.mutate(search.id, { onError: (error) => showActionError(t, 'savedSearch', error) }),
        },
      ]);
    },
    [remove, t],
  );

  // ActionMenu, not Alert: Android's system alert shows at most 3 buttons.
  const [menuFor, setMenuFor] = useState<SavedSearch | null>(null);
  const openMore = useCallback((search: SavedSearch) => setMenuFor(search), []);
  const menuItems: ActionMenuItem[] = menuFor
    ? [
        { key: 'rename', icon: 'create-outline', label: t('savedSearches.rename'), onPress: () => setRenaming(menuFor) },
        { key: 'filters', icon: 'options-outline', label: t('savedSearches.updateFiltersAction'), onPress: () => replaceWithMapFilters(menuFor) },
        { key: 'delete', icon: 'trash-outline', label: t('savedSearches.delete'), destructive: true, onPress: () => confirmDelete(menuFor) },
      ]
    : [];

  // The automatic "last search": keep it as a saved search, or delete it.
  const [lastMenuOpen, setLastMenuOpen] = useState(false);
  const lastMenuItems: ActionMenuItem[] = lastSearch
    ? [
        {
          key: 'keep',
          icon: 'bookmark-outline',
          label: t('savedSearches.keepLastSearch'),
          onPress: () =>
            keepLast.mutate(
              { id: lastSearch.id, name: lastSearch.name },
              {
                onError: (error) =>
                  error instanceof SavedSearchError && error.kind === 'limit'
                    ? Alert.alert(
                        t('savedSearches.limitTitle', { max: MAX_SAVED_SEARCHES }),
                        t('savedSearches.limitBody', { max: MAX_SAVED_SEARCHES }),
                      )
                    : showActionError(t, 'savedSearch', error),
              },
            ),
        },
        {
          key: 'delete',
          icon: 'trash-outline',
          label: t('savedSearches.delete'),
          destructive: true,
          onPress: () => remove.mutate(lastSearch.id, { onError: (error) => showActionError(t, 'savedSearch', error) }),
        },
      ]
    : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        {header}
        {loading ? (
          <ActivityIndicator style={styles.loading} color={theme.colors.accent} />
        ) : searches.length === 0 && !lastSearch ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.accentSurface }]}>
              <Ionicons name="notifications-outline" size={28} color={theme.colors.accent} />
            </View>
            <AppText variant="h3" style={styles.center}>
              {t('savedSearches.emptyTitle')}
            </AppText>
            <AppText variant="body" color="secondary" style={styles.center}>
              {t('savedSearches.emptyHint')}
            </AppText>
            <Button label={t('favorites.exploreMap')} onPress={() => router.push('/(tabs)/map')} style={styles.emptyCta} />
          </View>
        ) : (
          <View style={styles.list}>
            {lastSearch ? (
              <View style={styles.lastBlock}>
                <AppText variant="label" color="secondary">
                  {t('savedSearches.lastSearchTitle')}
                </AppText>
                <SavedSearchCard
                  search={lastSearch}
                  onShowOnMap={() => showOnMap(lastSearch)}
                  onToggleNotify={(enabled) => toggleNotify(lastSearch, enabled)}
                  onMore={() => setLastMenuOpen(true)}
                />
                <AppText variant="caption" color="secondary" style={styles.lastHint}>
                  {t('savedSearches.lastSearchHint')}
                </AppText>
              </View>
            ) : null}
            {searches.map((search) => (
              <SavedSearchCard
                key={search.id}
                search={search}
                onShowOnMap={() => showOnMap(search)}
                onToggleNotify={(enabled) => toggleNotify(search, enabled)}
                onMore={() => openMore(search)}
              />
            ))}
            <AppText variant="caption" color="secondary" style={styles.footer}>
              {t('savedSearches.footer', { count: searches.length, max: MAX_SAVED_SEARCHES })}
            </AppText>
          </View>
        )}
      </ScrollView>

      <ActionMenu
        visible={lastMenuOpen}
        title={lastSearch?.name}
        items={lastMenuItems}
        onClose={() => setLastMenuOpen(false)}
      />
      <ActionMenu visible={menuFor !== null} title={menuFor?.name} items={menuItems} onClose={() => setMenuFor(null)} />
      <SaveSearchModal
        visible={renaming !== null}
        mode="rename"
        filters={renaming?.filters ?? mapFilters}
        initialName={renaming?.name}
        saving={update.isPending}
        onCancel={() => setRenaming(null)}
        onSave={({ name }) => {
          if (!renaming) return;
          update.mutate(
            { id: renaming.id, name },
            { onSuccess: () => setRenaming(null), onError: (error) => showActionError(t, 'savedSearch', error) },
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md },
  loading: { marginTop: spacing.xl },
  list: { gap: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl, paddingHorizontal: spacing.md },
  emptyIcon: { width: 64, height: 64, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  center: { textAlign: 'center', maxWidth: 320 },
  emptyCta: { marginTop: spacing.md, maxWidth: 320 },
  lastBlock: { gap: spacing.sm, marginBottom: spacing.sm },
  lastHint: { lineHeight: 18 },
  footer: { textAlign: 'center', marginTop: spacing.sm, lineHeight: 18 },
});
