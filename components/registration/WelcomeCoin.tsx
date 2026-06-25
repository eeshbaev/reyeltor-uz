import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const COIN_SIZE = 48;
const SPRING = { damping: 14, stiffness: 120, mass: 0.9 };

export function WelcomeCoin() {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, SPRING);
  }, [scale]);

  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.coin, coinStyle]}>
      <Text style={styles.symbol}>UZS</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  coin: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
