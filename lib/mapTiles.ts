import type { StyleSpecification } from 'maplibre-gl';
import { getDevProxiedTileUrl, shouldUseDevTileProxy } from '@/lib/map/devTileProxy';
import { appendCartoKey, isMaptilerConfigured, maptilerKey } from '@/lib/supabase';

const CARTO_SUBDOMAINS = ['a', 'b', 'c', 'd'] as const;

function appendRetryParam(url: string, retry: number): string {
  if (retry <= 0) return url;
  return `${url}${url.includes('?') ? '&' : '?'}retry=${retry}`;
}

function cartoVoyagerTileUrls(retina = false): string[] {
  const suffix = retina ? '@2x' : '';
  // Official CARTO endpoint (also mirrored on subdomains for CDN load balancing).
  const templates = [
    appendCartoKey(`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${suffix}.png`),
    ...CARTO_SUBDOMAINS.map((subdomain) =>
      appendCartoKey(
        `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${suffix}.png`,
      ),
    ),
  ];
  return templates;
}

/** Rich raster basemap with street names, POIs, parks, and building footprints. */
export function getCartoVoyagerRasterStyle(retina = false): StyleSpecification {
  return {
    version: 8,
    sources: {
      carto: {
        type: 'raster',
        tiles: cartoVoyagerTileUrls(retina),
        tileSize: retina ? 512 : 256,
        maxzoom: 20,
      },
    },
    layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
  };
}

export function getWebMapStyle(retina = false): string | StyleSpecification {
  if (isMaptilerConfigured()) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`;
  }
  return getCartoVoyagerRasterStyle(retina);
}

/** @deprecated Use getWebMapStyle() */
export function getWebMapStyleUrl(): string {
  const style = getWebMapStyle();
  return typeof style === 'string' ? style : '';
}

export function usesVectorWebMap(): boolean {
  return isMaptilerConfigured();
}

/** 256px tiles — must match TILE_SIZE in lib/mapProjection.ts. */
export function getCartoRasterTileTemplates(retina = false): string[] {
  return cartoVoyagerTileUrls(retina);
}

export function getMaptilerRasterTileTemplates(retina = false): string[] {
  const scale = retina ? '@2x' : '';
  return [
    `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}${scale}.png?key=${maptilerKey}`,
  ];
}

export function getRasterTileTemplates(retina = false, preferCarto = false): string[] {
  if (!preferCarto && isMaptilerConfigured()) {
    return getMaptilerRasterTileTemplates(retina);
  }
  return getCartoRasterTileTemplates(retina);
}

export function getRasterTileUrl(
  z: number,
  x: number,
  y: number,
  retina = false,
  preferCarto = false,
  useDevProxy = false,
  retry = 0,
): string {
  const preferCartoFinal = preferCarto || !isMaptilerConfigured();
  const templates = getRasterTileTemplates(retina, preferCartoFinal);
  const template = templates[(x + y) % templates.length];
  const direct = appendRetryParam(
    template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)),
    retry,
  );

  // In dev, load tiles through Metro proxy (works reliably on Android emulators/devices).
  if (useDevProxy && shouldUseDevTileProxy()) {
    const proxied = getDevProxiedTileUrl(z, x, y, preferCartoFinal);
    if (proxied) {
      return appendRetryParam(proxied, retry);
    }
  }

  return direct;
}

export function getMapAttribution(): string {
  if (isMaptilerConfigured()) return '© MapTiler © OpenStreetMap';
  return '© CARTO © OpenStreetMap contributors';
}

export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  );
  return { x, y };
}

export function getMapBackgroundTileUrl(lat: number, lng: number, zoom: number, retina = false): string {
  const { x, y } = latLngToTile(lat, lng, zoom);
  return getRasterTileUrl(Math.round(zoom), x, y, retina);
}

export function usesMaptilerTiles(): boolean {
  return isMaptilerConfigured();
}

export function prefersRetinaMapTiles(): boolean {
  if (typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number') {
    return window.devicePixelRatio >= 1.5;
  }
  return true;
}
