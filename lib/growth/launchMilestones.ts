import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_LAUNCH_COUNT_KEY = '@reyeltor/app_launch_count';
export const USER_RATED_APP_KEY = '@reyeltor/user_rated_app';

/** Show rate / referral prompt on these cumulative app launch numbers. */
export const LAUNCH_MILESTONE_COUNTS = [
  3, 9, 12, 15, 20, 23, 26, 30, 36, 40, 45, 48, 50, 60, 70, 80,
] as const;

const LAUNCH_MILESTONE_SET = new Set<number>(LAUNCH_MILESTONE_COUNTS);

/** One increment per JS process (survives React Strict Mode remounts). */
let sessionLaunchRecorded = false;

export async function hasUserRatedApp(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(USER_RATED_APP_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markUserRatedApp(): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_RATED_APP_KEY, '1');
  } catch {
    // ignore
  }
}

export async function getAppLaunchCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(APP_LAUNCH_COUNT_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export interface LaunchMilestoneResult {
  count: number;
  shouldPrompt: boolean;
}

/** Call once per cold start. Increments launch count and returns whether to show the prompt. */
export async function recordAppLaunch(): Promise<LaunchMilestoneResult> {
  if (sessionLaunchRecorded) {
    const count = await getAppLaunchCount();
    return { count, shouldPrompt: false };
  }
  sessionLaunchRecorded = true;

  const previous = await getAppLaunchCount();
  const count = previous + 1;

  try {
    await AsyncStorage.setItem(APP_LAUNCH_COUNT_KEY, String(count));
  } catch {
    // ignore write failure; still evaluate milestone with in-memory count
  }

  if (await hasUserRatedApp()) {
    return { count, shouldPrompt: false };
  }

  return { count, shouldPrompt: LAUNCH_MILESTONE_SET.has(count) };
}
