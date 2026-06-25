import { Gesture } from 'react-native-gesture-handler';

/** Horizontal swipe that does not steal vertical list scrolling. */
export function createHorizontalSwipeGesture(onSwipe: (translationX: number) => void) {
  return Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-12, 12])
    .onEnd((event) => {
      onSwipe(event.translationX);
    })
    .runOnJS(true);
}

/** Map pan — allow free movement; carousel handles its own horizontal scroll in its zone. */
export const MAP_PAN_GESTURE = {
  minDistance: 0,
};

/** Shared bottom-sheet gesture tuning for smoother drag + scroll handoff. */
export const BOTTOM_SHEET_GESTURE_PROPS = {
  enableContentPanningGesture: true,
  enableHandlePanningGesture: true,
  enableOverDrag: false,
  overDragResistanceFactor: 2.5,
  keyboardBehavior: 'interactive' as const,
  android_keyboardInputMode: 'adjustResize' as const,
} as const;
