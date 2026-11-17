const https = require('https');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv optional — Expo also injects EXPO_PUBLIC_* at startup
}

const CARTO_SUBDOMAINS = ['a', 'b', 'c', 'd'];
const MAX_CONCURRENT = 12;
const TILE_CACHE_MAX = 512;
const TILE_CACHE_TTL_MS = 10 * 60 * 1000;

let activeRequests = 0;
const pendingQueue = [];
const tileCache = new Map();

function runQueued(task) {
  return new Promise((resolve, reject) => {
    pendingQueue.push({ task, resolve, reject });
    drainQueue();
  });
}

function drainQueue() {
  while (activeRequests < MAX_CONCURRENT && pendingQueue.length > 0) {
    const { task, resolve, reject } = pendingQueue.shift();
    activeRequests += 1;
    task()
      .then(resolve, reject)
      .finally(() => {
        activeRequests -= 1;
        drainQueue();
      });
  }
}

function cacheKey(provider, z, x, y) {
  const cartoKey = (process.env.EXPO_PUBLIC_CARTO_API_KEY ?? '').trim();
  const keyTag =
    provider === 'carto' && cartoKey.length >= 8 ? `:k${cartoKey.slice(-8)}` : ':nokey';
  return `${provider}:${z}/${x}/${y}${provider === 'carto' ? keyTag : ''}`;
}

function readCache(key) {
  const entry = tileCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TILE_CACHE_TTL_MS) {
    tileCache.delete(key);
    return null;
  }
  return entry.body;
}

function writeCache(key, body) {
  tileCache.set(key, { at: Date.now(), body });
  if (tileCache.size <= TILE_CACHE_MAX) return;
  const oldest = tileCache.keys().next().value;
  if (oldest) tileCache.delete(oldest);
}

function cartoTileUrl(z, x, y) {
  const subdomain = CARTO_SUBDOMAINS[(x + y) % CARTO_SUBDOMAINS.length];
  const key = (process.env.EXPO_PUBLIC_CARTO_API_KEY ?? '').trim();
  const base = `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
  if (!key || key.length < 8 || /placeholder|your_|example|^none$/i.test(key)) return base;
  return `${base}?key=${encodeURIComponent(key)}`;
}

function maptilerTileUrl(z, x, y) {
  const key = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
  if (!key || key.length < 12) return null;
  return `https://api.maptiler.com/maps/streets-v2/256/${z}/${x}/${y}.png?key=${key}`;
}

function fetchUpstream(url) {
  return runQueued(
    () =>
      new Promise((resolve, reject) => {
        const request = https.get(
          url,
          {
            headers: {
              'User-Agent': 'Reyeltor-Dev/1.0 (Metro tile proxy)',
              Accept: 'image/png,image/*,*/*',
            },
          },
          (upstream) => {
            if (
              upstream.statusCode &&
              upstream.statusCode >= 300 &&
              upstream.statusCode < 400 &&
              upstream.headers.location
            ) {
              upstream.resume();
              fetchUpstream(upstream.headers.location).then(resolve, reject);
              return;
            }

            if (upstream.statusCode !== 200) {
              upstream.resume();
              reject(new Error(`Tile upstream returned ${upstream.statusCode ?? 502}`));
              return;
            }

            const chunks = [];
            upstream.on('data', (chunk) => chunks.push(chunk));
            upstream.on('end', () => {
              resolve({
                statusCode: upstream.statusCode ?? 200,
                contentType: upstream.headers['content-type'] ?? 'image/png',
                body: Buffer.concat(chunks),
              });
            });
          },
        );

        request.on('error', reject);
        request.setTimeout(15_000, () => {
          request.destroy(new Error('Tile proxy fetch timed out'));
        });
      }),
  );
}

function handleMapTileProxy(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const z = Number(url.searchParams.get('z'));
  const x = Number(url.searchParams.get('x'));
  const y = Number(url.searchParams.get('y'));
  const provider = url.searchParams.get('provider') ?? 'carto';

  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Invalid tile coordinates');
    return true;
  }

  const key = cacheKey(provider, z, x, y);
  const cached = readCache(key);
  if (cached) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(cached);
    return true;
  }

  const upstream =
    provider === 'maptiler' ? maptilerTileUrl(z, x, y) : cartoTileUrl(z, x, y);

  if (!upstream) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain');
    res.end('MapTiler key not configured');
    return true;
  }

  fetchUpstream(upstream)
    .then(({ statusCode, contentType, body }) => {
      if (body.length > 512) writeCache(key, body);
      res.statusCode = statusCode;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(body);
    })
    .catch(() => {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Tile proxy fetch failed');
    });

  return true;
}

function enhanceMetroMiddleware(middleware) {
  return (req, res, next) => {
    if (req.url?.startsWith('/map-tile?')) {
      handleMapTileProxy(req, res);
      return;
    }
    return middleware(req, res, next);
  };
}

module.exports = { enhanceMetroMiddleware };
