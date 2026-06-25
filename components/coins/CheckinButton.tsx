import { hapticMedium } from '@/lib/haptics';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Animated } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { CHECKIN_DAYS } from '@/lib/constants';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface CheckinButtonProps {
  canCheckIn: boolean;
  onCheckIn: () => void;
  checkedInToday: boolean;
}

function getNextCheckinDay(): string {
  const today = new Date().getDay();
  for (let offset = 1; offset <= 7; offset++) {
    const day = (today + offset) % 7;
    if (CHECKIN_DAYS.includes(day)) return DAY_KEYS[day];
  }
  return 'tuesday';
}

export function CheckinButton({ canCheckIn, onCheckIn, checkedInToday }: CheckinButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(() => {
    hapticMedium();
    onCheckIn();
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (checkedInToday) {
    return (
      <Pressable style={[styles.button, { backgroundColor: theme.colors.successSurface }]} disabled>
        <AppText variant="label" color="success">
          {t('coins.checkedIn')}
        </AppText>
      </Pressable>
    );
  }

  if (!canCheckIn) {
    return (
      <Pressable style={[styles.button, { backgroundColor: theme.colors.surface }]} disabled>
        <AppText variant="label" color="tertiary">
          {t('coins.nextCheckin', { day: t(`days.${getNextCheckinDay()}`) })}
        </AppText>
      </Pressable>
    );
  }

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress}>
      <Animated.View style={[styles.button, { backgroundColor: theme.colors.accent, transform: [{ scale }] }]}>
        <AppText variant="label" color="onAccent">
          {t('coins.checkinAvailable')}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    button: {
      padding: spacing.md,
      borderRadius: 14,
      alignItems: 'center',
      marginHorizontal: spacing.md,
      minHeight: 52,
      justifyContent: 'center',
    },
  });
}
