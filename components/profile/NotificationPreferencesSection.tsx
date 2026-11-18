import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import {
  fetchNotificationPreferences,
  readStoredPermission,
  rescheduleAllLocalNotifications,
  storePermission,
  syncPushRegistration,
  type NotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/notifications/types';
import { useTheme } from '@/lib/theme';

interface NotificationPreferencesSectionProps {
  userId: string;
}

export function NotificationPreferencesSection({ userId }: NotificationPreferencesSectionProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [systemGranted, setSystemGranted] = useState<boolean | null>(null);

  const buildFallbackPrefs = useCallback(
    (): NotificationPreferences => ({
      user_id: userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      locale: i18n.language.split('-')[0] ?? 'en',
      updated_at: new Date().toISOString(),
    }),
    [i18n.language, userId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      let nextPrefs = buildFallbackPrefs();
      try {
        nextPrefs = await fetchNotificationPreferences(userId);
      } catch (error) {
        console.warn('[NotificationPreferencesSection] fetch failed:', error);
        setLoadError(true);
      }

      let stored: Awaited<ReturnType<typeof readStoredPermission>> = null;
      try {
        stored = await readStoredPermission();
      } catch (error) {
        console.warn('[NotificationPreferencesSection] read permission failed:', error);
      }

      let osGranted = false;
      try {
        const os = await Notifications.getPermissionsAsync();
        osGranted = os.status === 'granted';
      } catch (error) {
        console.warn('[NotificationPreferencesSection] OS permission check failed:', error);
      }

      setPrefs(nextPrefs);
      setSystemGranted(stored === 'granted' || osGranted);
    } finally {
      setLoading(false);
    }
  }, [buildFallbackPrefs, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchPref = async (patch: Partial<NotificationPreferences>) => {
    if (!prefs) return;
    setSaving(true);
    try {
      const next = await updateNotificationPreferences(userId, patch);
      setPrefs(next);
      await rescheduleAllLocalNotifications(userId);
    } finally {
      setSaving(false);
    }
  };

  const requestSystemPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    await storePermission(granted);
    setSystemGranted(granted);
    if (granted) {
      await syncPushRegistration(userId);
      await rescheduleAllLocalNotifications(userId);
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      void Linking.openURL('app-settings:');
    } else {
      void Linking.openSettings();
    }
  };

  if (loading) {
    return (
      <View style={[styles.section, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!prefs) {
    return null;
  }

  return (
    <View style={[styles.section, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}>
      <AppText variant="label" style={styles.title}>
        {t('notifications.settingsTitle')}
      </AppText>
      <AppText variant="caption" color="secondary" style={styles.hint}>
        {t('notifications.settingsHint')}
      </AppText>

      {loadError ? (
        <Pressable onPress={() => void load()} style={styles.settingsLink}>
          <AppText variant="caption" color="accent">
            {t('common.retry')}
          </AppText>
        </Pressable>
      ) : null}

      {systemGranted === false ? (
        <Pressable
          onPress={requestSystemPermission}
          style={[styles.enableRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        >
          <AppText variant="label" color="accent">
            {t('notifications.enable')}
          </AppText>
        </Pressable>
      ) : null}

      {systemGranted === true ? (
        <View style={styles.rows}>
          <PrefRow
            label={t('notifications.prefListings')}
            value={prefs.listings_enabled}
            disabled={saving}
            onChange={(value) => void patchPref({ listings_enabled: value })}
          />
          <PrefRow
            label={t('notifications.prefFavorites')}
            value={prefs.favorites_enabled}
            disabled={saving}
            onChange={(value) => void patchPref({ favorites_enabled: value })}
          />
          <PrefRow
            label={t('notifications.prefEngagement')}
            value={prefs.engagement_enabled}
            disabled={saving}
            onChange={(value) => void patchPref({ engagement_enabled: value })}
          />
          <PrefRow
            label={t('notifications.prefCheckin')}
            value={prefs.checkin_enabled}
            disabled={saving}
            onChange={(value) => void patchPref({ checkin_enabled: value })}
          />
        </View>
      ) : null}

      <Pressable onPress={openSettings} style={styles.settingsLink}>
        <AppText variant="caption" color="accent">
          {t('notifications.openSettings')}
        </AppText>
      </Pressable>
    </View>
  );
}

function PrefRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderColor: theme.colors.border }]}>
      <AppText variant="body" style={styles.rowLabel}>
        {label}
      </AppText>
      <Switch value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  title: { marginBottom: spacing.xs },
  hint: { marginBottom: spacing.md },
  enableRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rows: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, paddingRight: spacing.sm },
  settingsLink: { marginTop: spacing.sm, alignItems: 'center' },
});
