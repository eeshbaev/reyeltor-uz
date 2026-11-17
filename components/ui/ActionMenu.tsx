import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  items: ActionMenuItem[];
  onClose: () => void;
}

/**
 * Bottom action menu. Use instead of Alert.alert when there are more than two choices:
 * Android's system alert shows at most three buttons and silently drops the rest.
 */
export function ActionMenu({ visible, title, items, onClose }: ActionMenuProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.cancel')} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border, paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
        {title ? (
          <AppText variant="label" color="secondary" style={styles.title} numberOfLines={2}>
            {title}
          </AppText>
        ) : null}
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              // Let this modal finish closing first: iOS will not present a second modal
              // (e.g. a rename or price dialog) while one is still dismissing.
              setTimeout(item.onPress, 300);
            }}
            style={({ pressed }) => [
              styles.row,
              { borderColor: theme.colors.border, backgroundColor: pressed ? theme.colors.surface : 'transparent' },
            ]}
          >
            {item.icon ? (
              <Ionicons name={item.icon} size={20} color={item.destructive ? theme.colors.danger : theme.colors.primary} />
            ) : null}
            <AppText variant="body" color={item.destructive ? 'danger' : 'primary'}>
              {item.label}
            </AppText>
          </Pressable>
        ))}
        <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
          <AppText variant="label" color="secondary">
            {t('common.cancel')}
          </AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  title: { textAlign: 'center', marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
});
