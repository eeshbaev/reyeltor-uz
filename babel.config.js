module.exports = function (api) {
  api.cache(true);
  // SDK 54+: babel-preset-expo adds the Reanimated 4 / worklets plugin automatically.
  return {
    presets: ['babel-preset-expo'],
  };
};
