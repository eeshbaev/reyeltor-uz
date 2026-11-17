import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

function parseScriptMetroOrigin(): string | null {
  const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  const match = scriptURL.match(/^https?:\/\/([^/?#]+)/);
  if (!match?.[1]) return null;
  return `http://${match[1]}`;
}

function parseConstantsMetroOrigin(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  if (!hostUri) return null;

  const [rawHost, rawPort] = hostUri.split(':');
  if (!rawHost) return null;

  let host = rawHost;
  if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    host = '10.0.2.2';
  }

  const port = rawPort ?? '8081';
  return `http://${host}:${port}`;
}

/** Metro origin for dev-only tile proxying (Android emulators often have broken DNS). */
export function getDevMetroOrigin(): string | null {
  if (!__DEV__ || Platform.OS === 'web') return null;
  return parseScriptMetroOrigin() ?? parseConstantsMetroOrigin();
}

export function shouldUseDevTileProxy(): boolean {
  return getDevMetroOrigin() != null;
}

export function getDevProxiedTileUrl(
  z: number,
  x: number,
  y: number,
  preferCarto: boolean,
): string | null {
  const origin = getDevMetroOrigin();
  if (!origin) return null;
  const provider = preferCarto ? 'carto' : 'maptiler';
  return `${origin}/map-tile?z=${z}&x=${x}&y=${y}&provider=${provider}`;
}
