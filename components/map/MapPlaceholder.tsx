import { StyleSheet, View, type ViewStyle } from 'react-native';

interface MapPlaceholderProps {
  style?: ViewStyle;
}

/** Neutral map stand-in when Maptiler is not configured. */
export function MapPlaceholder({ style }: MapPlaceholderProps) {
  return (
    <View style={[styles.base, style]}>
      <View style={styles.gridH1} />
      <View style={styles.gridH2} />
      <View style={styles.gridV1} />
      <View style={styles.gridV2} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: '#dce6f0',
    overflow: 'hidden',
  },
  gridH1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  gridH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  gridV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  gridV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
