export const TILE_SIZE = 256;
export const MIN_ZOOM = 7;
export const MAX_ZOOM = 19;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function lngLatToPixel(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

export function pixelToLngLat(x: number, y: number, zoom: number): { lng: number; lat: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale)));
  const lat = (latRad * 180) / Math.PI;
  return { lng, lat };
}

export function getBoundsFromViewport(
  centerLng: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number,
): [number, number, number, number] {
  const centerPx = lngLatToPixel(centerLng, centerLat, zoom);
  const topLeft = pixelToLngLat(centerPx.x - width / 2, centerPx.y - height / 2, zoom);
  const bottomRight = pixelToLngLat(centerPx.x + width / 2, centerPx.y + height / 2, zoom);
  return [topLeft.lng, bottomRight.lat, bottomRight.lng, topLeft.lat];
}

export function lngLatToScreen(
  lng: number,
  lat: number,
  centerLng: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const centerPx = lngLatToPixel(centerLng, centerLat, zoom);
  const pointPx = lngLatToPixel(lng, lat, zoom);
  return {
    x: pointPx.x - centerPx.x + width / 2,
    y: pointPx.y - centerPx.y + height / 2,
  };
}

export interface MapTileCoord {
  x: number;
  y: number;
  z: number;
}

export function getVisibleTiles(
  centerLng: number,
  centerLat: number,
  zoom: number,
  mapWidth: number,
  mapHeight: number,
  padding = 2,
): { tiles: MapTileCoord[]; tileZoom: number; scale: number } {
  const tileZoom = Math.floor(zoom);
  const scale = 2 ** (zoom - tileZoom);
  const center = lngLatToPixel(centerLng, centerLat, tileZoom);
  const halfW = mapWidth / 2 / scale;
  const halfH = mapHeight / 2 / scale;

  const minX = Math.floor((center.x - halfW) / TILE_SIZE) - padding;
  const maxX = Math.floor((center.x + halfW) / TILE_SIZE) + padding;
  const minY = Math.floor((center.y - halfH) / TILE_SIZE) - padding;
  const maxY = Math.floor((center.y + halfH) / TILE_SIZE) + padding;
  const maxTile = 2 ** tileZoom;

  const tiles: MapTileCoord[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      if (x >= 0 && x < maxTile && y >= 0 && y < maxTile) tiles.push({ x, y, z: tileZoom });
    }
  }

  return { tiles, tileZoom, scale };
}

export function tileToScreen(
  tileX: number,
  tileY: number,
  centerLng: number,
  centerLat: number,
  zoom: number,
  mapWidth: number,
  mapHeight: number,
): { left: number; top: number; size: number } {
  const tileZoom = Math.floor(zoom);
  const scale = 2 ** (zoom - tileZoom);
  const center = lngLatToPixel(centerLng, centerLat, tileZoom);
  const tileWorldX = tileX * TILE_SIZE;
  const tileWorldY = tileY * TILE_SIZE;
  const size = TILE_SIZE * scale;
  return {
    left: (tileWorldX - center.x) * scale + mapWidth / 2,
    top: (tileWorldY - center.y) * scale + mapHeight / 2,
    size,
  };
}
