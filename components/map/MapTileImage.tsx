import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { shouldUseDevTileProxy } from '@/lib/map/devTileProxy';
import { tileLoadLimiter } from '@/lib/map/tileLoadLimiter';
import { getRasterTileUrl } from '@/lib/mapTiles';

const TILE_LOAD_TIMEOUT_MS = 8000;
const MAX_TILE_RETRIES = 3;

interface MapTileImageProps {
  z: number;
  x: number;
  y: number;
  style: StyleProp<ImageStyle>;
  preferCarto: boolean;
  useDevProxy: boolean;
  onStrategyFailure: () => void;
  /** Underlay tiles load after the visible ones. */
  priority?: 'high' | 'low';
}

export function MapTileImage({
  z,
  x,
  y,
  style,
  preferCarto,
  useDevProxy,
  onStrategyFailure,
  priority = 'high',
}: MapTileImageProps) {
  const canProxy = shouldUseDevTileProxy();
  const [proxied, setProxied] = useState(useDevProxy);
  const [attempt, setAttempt] = useState(0);
  const [canLoad, setCanLoad] = useState(false);
  const loadedRef = useRef(false);
  const slotHeldRef = useRef(false);

  useEffect(() => {
    if (useDevProxy) setProxied(true);
  }, [useDevProxy]);

  const releaseSlot = useCallback(() => {
    if (!slotHeldRef.current) return;
    slotHeldRef.current = false;
    tileLoadLimiter.release();
  }, []);

  useEffect(() => {
    loadedRef.current = false;
    setCanLoad(false);
    let cancelled = false;

    tileLoadLimiter
      .acquire(priority)
      .then(() => {
        if (cancelled) {
          tileLoadLimiter.release();
          return;
        }
        slotHeldRef.current = true;
        setCanLoad(true);
      })
      .catch((error) => {
        console.error('Failed to acquire tile load slot:', error);
        if (!cancelled) {
          setCanLoad(false);
        }
      });

    return () => {
      cancelled = true;
      releaseSlot();
    };
  }, [releaseSlot, z, x, y, proxied, preferCarto, attempt, priority]);

  const uri = getRasterTileUrl(z, x, y, false, preferCarto, proxied, attempt);
  const sourceKey = `${preferCarto ? 'carto' : 'maptiler'}-${proxied ? 'proxy' : 'direct'}-${z}-${x}-${y}-${attempt}`;

  const retry = useCallback(() => {
    if (attempt + 1 < MAX_TILE_RETRIES) {
      setAttempt((value) => value + 1);
      return;
    }
    if (!proxied && canProxy) {
      setProxied(true);
      setAttempt(0);
      onStrategyFailure();
      return;
    }
    if (proxied) {
      setProxied(false);
      setAttempt(0);
    }
  }, [attempt, canProxy, onStrategyFailure, proxied]);

  useEffect(() => {
    if (!canLoad) return undefined;
    const timer = setTimeout(() => {
      if (!loadedRef.current) retry();
    }, TILE_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [canLoad, retry, sourceKey]);

  if (!canLoad) return null;

  return (
    <Image
      key={sourceKey}
      source={{ uri }}
      style={style}
      resizeMode="stretch"
      onLoad={() => {
        loadedRef.current = true;
        releaseSlot();
      }}
      onError={() => {
        releaseSlot();
        retry();
      }}
    />
  );
}
