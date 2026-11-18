import type { ReactNode } from 'react';
import type { Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/navigation/BackButton';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { typeSize } from '@/lib/design/typography';
import { useTheme } from '@/lib/theme';

interface StackScreenHeaderProps {
  title: string;
  backHref?: Href;
  backFallbackHref?: Href;
  right?: ReactNode;
}

export function StackScreenHeader({
  title,
  backHref,
  backFallbackHref = '/(tabs)/map',
  right,
}: StackScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + spacing.xs,
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.side}>
        <BackButton href={backHref} fallbackHref={backFallbackHref} />
      </View>
      <AppText variant="body" style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
        {title}
      </AppText>
      <View style={[styles.side, styles.sideRight]}>{right ?? null}</View>
    </View>
  );
}

const SIDE_WIDTH = 44;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: SIDE_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: typeSize.h3,
  },
});
