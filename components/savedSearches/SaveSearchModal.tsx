import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import {
  defaultSavedSearchName,
  describeSavedSearch,
  hasDrawnArea,
  SAVED_SEARCH_NAME_MAX,
} from '@/lib/savedSearches';
import { useTheme } from '@/lib/theme';
import type { ListingFilters } from '@/types';

interface SaveSearchModalProps {
  visible: boolean;
  /** 'create' saves the filters; 'rename' only edits the name. */
  mode?: 'create' | 'rename';
  filters: ListingFilters;
  initialName?: string;
  saving?: boolean;
  onCancel: () => void;
  onSave: (input: { name: string; notifyEnabled: boolean }) => void;
}

export function SaveSearchModal({
  visible,
  mode = 'create',
  filters,
  initialName,
  saving = false,
  onCancel,
  onSave,
}: SaveSearchModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const drawn = hasDrawnArea(filters);
  const suggestedName = useMemo(() => initialName ?? defaultSavedSearchName(t, filters), [filters, initialName, t]);
  const summary = useMemo(() => describeSavedSearch(t, filters), [filters, t]);
  const [name, setName] = useState(suggestedName);
  const [notify, setNotify] = useState(!drawn);

  useEffect(() => {
    if (visible) {
      setName(suggestedName);
      setNotify(!drawn);
    }
  }, [visible, suggestedName, drawn]);

  const trimmed = name.trim();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel={t('common.cancel')} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
          <View style={styles.titleRow}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.accentSurface }]}>
              <Ionicons name="notifications" size={20} color={theme.colors.accent} />
            </View>
            <View style={styles.titleCopy}>
              <AppText variant="h3">
                {mode === 'rename' ? t('savedSearches.renameTitle') : t('savedSearches.saveTitle')}
              </AppText>
              {mode === 'create' ? (
                <AppText variant="caption" color="secondary">
                  {t('savedSearches.saveSubtitle')}
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.summary}>
            {summary.map((part, index) => (
              <View
                key={`${index}-${part}`}
                style={[styles.summaryChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <AppText variant="micro" color="secondary">
                  {part}
                </AppText>
              </View>
            ))}
          </View>

          <TextField
            label={t('savedSearches.nameLabel')}
            value={name}
            onChangeText={(text) => setName(text.slice(0, SAVED_SEARCH_NAME_MAX))}
            maxLength={SAVED_SEARCH_NAME_MAX}
            returnKeyType="done"
            autoCorrect={false}
          />

          {mode === 'create' ? (
            <View style={[styles.notifyRow, { borderColor: theme.colors.border }]}>
              <View style={styles.notifyCopy}>
                <AppText variant="label">{t('savedSearches.notifyToggle')}</AppText>
                <AppText variant="micro" color="secondary" style={styles.notifyHint}>
                  {drawn ? t('savedSearches.drawnAreaNoAlerts') : t('savedSearches.notifyHint')}
                </AppText>
              </View>
              <Switch
                value={notify}
                onValueChange={setNotify}
                disabled={drawn}
                trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
                accessibilityLabel={t('savedSearches.notifyToggle')}
              />
            </View>
          ) : null}

          <Button
            label={t('common.save')}
            onPress={() => onSave({ name: trimmed, notifyEnabled: notify })}
            disabled={!trimmed}
            loading={saving}
          />
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
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  titleCopy: { flex: 1, gap: 2 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  summaryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifyCopy: { flex: 1 },
  notifyHint: { marginTop: 2, lineHeight: 16 },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
});
