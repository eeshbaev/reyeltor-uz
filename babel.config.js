module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const production = process.env.NODE_ENV === 'production';
  // SDK 54+: babel-preset-expo adds the Reanimated 4 / worklets plugin automatically.
  return {
    presets: ['babel-preset-expo'],
    // Release builds drop console output so no user content can end up in device logs
    // (manual SP-05). console.error stays: crashes still reach lib/logging/remoteErrors.ts.
    plugins: production ? [['transform-remove-console', { exclude: ['error'] }]] : [],
  };
};
