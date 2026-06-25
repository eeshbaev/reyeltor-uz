import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Polygon, Polyline } from 'react-native-svg';
import {
  isClosedPath,
  simplifyPath,
  type MapAreaPolygon,
} from '@/lib/map/polygon';
import type { MapViewRef } from './types';

interface PenDrawOverlayProps {
  mapRef: React.RefObject<MapViewRef | null>;
  onComplete: (polygon: MapAreaPolygon) => void;
  onCancel: () => void;
}

export function PenDrawOverlay({ mapRef, onComplete, onCancel }: PenDrawOverlayProps) {
  const points = useRef<{ lat: number; lng: number }[]>([]);
  const screenPoints = useRef<{ x: number; y: number }[]>([]);
  const [svgPoints, setSvgPoints] = useState<{ x: number; y: number }[]>([]);
  const [completed, setCompleted] = useState(false);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      points.current = [];
      screenPoints.current = [];
      setCompleted(false);
      setSvgPoints([]);
    })
    .onUpdate((e) => {
      const screen = { x: e.x, y: e.y };
      screenPoints.current.push(screen);
      setSvgPoints([...screenPoints.current]);
      const latlng = mapRef.current?.unproject(e.x, e.y);
      if (latlng) points.current.push(latlng);
    })
    .onEnd(() => {
      if (points.current.length < 10) {
        setSvgPoints([]);
        onCancel();
        return;
      }
      if (isClosedPath(points.current)) {
        const simplified = simplifyPath(points.current, 0.0001);
        setCompleted(true);
        onComplete({ points: simplified });
      } else {
        setSvgPoints([]);
        onCancel();
      }
    })
    .runOnJS(true);

  const pointString = svgPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.capture} pointerEvents="auto">
        <Svg width="100%" height="100%" style={styles.svg} pointerEvents="none">
          {completed ? (
            <Polygon
              points={pointString}
              stroke="#DC2626"
              strokeWidth={2.5}
              fill="rgba(220,38,38,0.15)"
            />
          ) : svgPoints.length > 0 ? (
            <Polyline
              points={pointString}
              stroke="#DC2626"
              strokeWidth={2.5}
              fill="none"
            />
          ) : null}
        </Svg>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  capture: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  svg: { position: 'absolute', top: 0, left: 0 },
});
