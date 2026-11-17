module.exports = function (api) {
  api.cache.invalidate(() => require('react-native-reanimated/package.json').version);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
