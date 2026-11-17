import { Linking, Platform } from 'react-native';
import { PLAY_STORE_URL } from '@/lib/constants';
import { markUserRatedApp } from '@/lib/growth/launchMilestones';

const ANDROID_PACKAGE = 'uz.reyeltor.app';

export async function openAppRating(): Promise<void> {
  const marketUrl = `market://details?id=${ANDROID_PACKAGE}`;
  const webUrl = PLAY_STORE_URL;

  try {
    if (Platform.OS === 'android') {
      const canOpenMarket = await Linking.canOpenURL(marketUrl);
      await Linking.openURL(canOpenMarket ? marketUrl : webUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    await Linking.openURL(webUrl);
  }

  await markUserRatedApp();
}
