import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { openAppRating } from '@/lib/growth/rateApp';

/**
 * The one place that decides when to ask for a rating. Rule: earn it first.
 *
 * We ask only right after a real value moment, at a natural pause, never on launch counts,
 * never during onboarding, forms, errors or sign-in. Google's own in-app review window is
 * used (it also applies its own quota). No question comes before it ("Do you like the
 * app?" is not allowed by Google Play's guidelines). Feedback lives on the About screen.
 */

export type ValueMoment =
  /** A seller's first listing went live on the map. */
  | 'first_listing_live'
  /** A listing was marked rented or sold: the app did its job. */
  | 'listing_closed';

const STATE_KEY = '@reyeltor/rating_state_v1';
const COOLDOWN_DAYS = 90;
const MAX_ASKS = 3;
const MIN_DAYS_SINCE_INSTALL = 2;
const DAY_MS = 86_400_000;

export interface RatingState {
  firstSeenAt: number;
  lastAskedAt: number | null;
  asks: number;
  /** Set when the person tapped "Rate" in the app (we can't see what they did in the store). */
  rated: boolean;
  moments: Partial<Record<ValueMoment, number>>;
}

async function readState(): Promise<RatingState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw) as RatingState;
  } catch {
    // fall through to a fresh state
  }
  const fresh: RatingState = { firstSeenAt: Date.now(), lastAskedAt: null, asks: 0, rated: false, moments: {} };
  await writeState(fresh);
  return fresh;
}

async function writeState(state: RatingState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore: worst case we ask a little later
  }
}

/** Pure rule, exported for tests. */
export function isEligible(state: RatingState, now = Date.now()): boolean {
  if (state.rated || state.asks >= MAX_ASKS) return false;
  if (now - state.firstSeenAt < MIN_DAYS_SINCE_INSTALL * DAY_MS) return false;
  if (state.lastAskedAt && now - state.lastAskedAt < COOLDOWN_DAYS * DAY_MS) return false;
  return true;
}

/** Call once on app start so "days since install" is known. */
export async function initRatingState(): Promise<void> {
  await readState();
}

/**
 * Record a value moment and, if the person is eligible, ask for a rating after `pauseMs`
 * (so a success message can finish first). Skipped if the app went to the background.
 */
export async function onValueMoment(moment: ValueMoment, pauseMs = 1500): Promise<void> {
  const state = await readState();
  state.moments[moment] = (state.moments[moment] ?? 0) + 1;
  await writeState(state);
  if (!isEligible(state)) return;

  await new Promise((resolve) => setTimeout(resolve, pauseMs));
  if (AppState.currentState !== 'active') return;

  state.lastAskedAt = Date.now();
  state.asks += 1;
  await writeState(state);

  try {
    // Loaded lazily: an app build made before this native module was added must not crash.
    const StoreReview = await import('expo-store-review');
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    }
  } catch {
    // The native window is best-effort; never surface an error for it.
  }
}

/** "Rate on Google Play" pressed somewhere in the app: stop asking. */
export async function rateFromSettings(): Promise<void> {
  const state = await readState();
  state.rated = true;
  await writeState(state);
  await openAppRating();
}
