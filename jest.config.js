module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // RN navigation, reanimated, svg and the rest of the native ecosystem ship
  // ES modules that need to be transpiled by babel-jest. Whitelist the prefixes
  // here so Jest doesn't try to require them as raw CommonJS.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native' +
      '|@react-native' +
      '|@react-navigation' +
      '|react-native-reanimated' +
      '|react-native-bootsplash' +
      '|react-native-svg' +
      '|react-native-screens' +
      '|react-native-safe-area-context' +
      '|react-native-linear-gradient' +
      '|react-native-iap' +
      '|react-native-nitro-modules' +
      '|react-native-nitro-sound' +
      '|react-native-video' +
      '|react-native-webview' +
      '|react-native-youtube-iframe' +
      '|react-native-image-picker' +
      '|@react-native-async-storage' +
      '|@react-native-firebase' +
      '|@react-native-google-signin' +
      '|@invertase/react-native-apple-authentication' +
      ')/)',
  ],
};
