const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { enhanceMetroMiddleware } = require('./scripts/metroMapTileProxy');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const maplibreStub = path.resolve(__dirname, 'lib/stubs/maplibre.web.ts');

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === '@maplibre/maplibre-react-native' ||
    moduleName.startsWith('@maplibre/maplibre-react-native/')
  ) {
    return { filePath: maplibreStub, type: 'sourceFile' };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

const defaultEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    const base = defaultEnhanceMiddleware ? defaultEnhanceMiddleware(middleware) : middleware;
    return enhanceMetroMiddleware(base);
  },
};

module.exports = config;
