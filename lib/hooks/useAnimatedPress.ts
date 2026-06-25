import { hapticLight } from '@/lib/haptics';
import { useRef } from 'react';
import { Animated } from 'react-native';
import { motion } from '@/lib/design/motion';
import { useReduceMotion } from './useReduceMotion';

export function useAnimatedPress(onPress?: () => void) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  const onPressIn = () => {
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: 0.97,
        useNativeDriver: true,
        ...motion.springSnappy,
      }).start();
    }
    hapticLight();
  };

  const onPressOut = () => {
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        ...motion.spring,
      }).start();
    }
  };

  const handlePress = () => {
    onPress?.();
  };

  return { scale, onPressIn, onPressOut, handlePress };
}
