/**
 * Expo config plugin: library modules that don't declare an NDK (e.g. @sentry/react-native)
 * otherwise fall back to the Android Gradle Plugin's default NDK, which triggers a separate
 * ~1 GB NDK download (that download used to hang builds). Point them at the app's NDK.
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// reyeltor: library NDK version';

module.exports = function withLibraryNdkVersion(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += `
${MARKER}
subprojects { subproject ->
  subproject.plugins.withId('com.android.library') {
    if (rootProject.ext.has('ndkVersion')) {
      subproject.android.ndkVersion = rootProject.ext.ndkVersion
    }
  }
}
`;
    }
    return mod;
  });
};
