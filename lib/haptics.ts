import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function canUseHaptics(): boolean {
  return Platform.OS !== 'web';
}

export function hapticLight(): void {
  if (!canUseHaptics()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticMedium(): void {
  if (!canUseHaptics()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticSuccess(): void {
  if (!canUseHaptics()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
