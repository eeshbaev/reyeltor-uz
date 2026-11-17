import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface ProfileMenuRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  isDanger?: boolean;
}

export function ProfileMenuRow({
  icon,
  label,
  trailing,
  onPress,
  isDanger = false,
}: ProfileMenuRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? theme.colors.surfaceElevated : 'transparent',
        },
      ]}
    >
      <View style={styles.content}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isDanger ? theme.colors.danger : theme.colors.primary}
            style={styles.icon}
          />
        )}
        <AppText
          variant="body"
          color={isDanger ? 'danger' : 'primary'}
          style={styles.label}
        >
          {label}
        </AppText>
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  icon: {
    width: 24,
  },
  label: {
    flex: 1,
  },
  trailing: {
    marginLeft: spacing.sm,
  },
});
