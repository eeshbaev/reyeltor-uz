import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { describeSavedSearch, hasDrawnArea, type SavedSearch } from '@/lib/savedSearches';
import { useTheme } from '@/lib/theme';

interface SavedSearchCardProps {
  search: SavedSearch;
  onShowOnMap: () => void;
  onToggleNotify: (enabled: boolean) => void;
  onMore: () => void;
}

export function SavedSearchCard({ search, onShowOnMap, onToggleNotify, onMore }: SavedSearchCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const summary = useMemo(() => describeSavedSearch(t, search.filters), [search.filters, t]);
  const drawn = hasDrawnArea(search.filters);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <AppText variant="h3" numberOfLines={2} style={styles.title}>
            {search.name}
          </AppText>
          {search.newMatches > 0 ? (
            <View style={[styles.newBadge, { backgroundColor: theme.colors.accent }]}>
              <AppText variant="micro" color="onAccent" style={styles.newBadgeText}>
                {t('savedSearches.newMatches', { count: search.newMatches })}
              </AppText>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={onMore}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('savedSearches.moreActions')}
          style={styles.more}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.secondary} />
        </Pressable>
      </View>

      <View style={styles.chips}>
        {summary.map((part, index) => (
          <View
            key={`${index}-${part}`}
            style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <AppText variant="micro" color="secondary">
              {part}
            </AppText>
          </View>
        ))}
      </View>

      <View style={[styles.notifyRow, { borderColor: theme.colors.border }]}>
        <Ionicons
          name={search.notify_enabled ? 'notifications' : 'notifications-off-outline'}
          size={18}
          color={search.notify_enabled ? theme.colors.accent : theme.colors.tertiary}
        />
        <View style={styles.notifyCopy}>
          <AppText variant="label">{t('savedSearches.notifyToggle')}</AppText>
          {drawn ? (
            <AppText variant="micro" color="secondary">
              {t('savedSearches.drawnAreaNoAlerts')}
            </AppText>
          ) : null}
        </View>
        <Switch
          value={search.notify_enabled}
          onValueChange={onToggleNotify}
          disabled={drawn}
          trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
          accessibilityLabel={t('savedSearches.notifyToggle')}
        />
      </View>

      <Pressable
        onPress={onShowOnMap}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.showOnMap,
          { backgroundColor: pressed ? theme.colors.accentSurface : 'transparent', borderColor: theme.colors.accent },
        ]}
      >
        <Ionicons name="map-outline" size={16} color={theme.colors.accent} />
        <AppText variant="label" color="accent">
          {t('savedSearches.showOnMap')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titleWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1 },
  newBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  newBadgeText: { fontWeight: '700' },
  more: { padding: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notifyCopy: { flex: 1 },
  showOnMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
