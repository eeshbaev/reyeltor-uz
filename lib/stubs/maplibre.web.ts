import { View, type ViewProps } from 'react-native';

const noop = () => null;

export const Map = View;
export const Camera = noop;
export const Marker = View;
export const RasterSource = View;
export const Layer = noop;
export const RasterLayer = noop;

export type CameraRef = { flyTo: () => void; easeTo: () => void };
export type ViewStateChangeEvent = { zoom: number; bounds: [number, number, number, number] };
