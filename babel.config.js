module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Production hardening: strip `console.log/info/debug/trace` from the
  // emitted bundle so leftover diagnostic statements don't ship to
  // users. We deliberately KEEP `console.warn` and `console.error` so
  // unhandled paths still surface in logcat / Crashlytics.
  //
  // The app-level src/utils/logger.ts already gates on __DEV__, but
  // this acts as a second line of defense for any direct console.*
  // calls in node_modules or third-party code that we don't control.
  env: {
    production: {
      plugins: [
        [
          'transform-remove-console',
          { exclude: ['warn', 'error'] },
        ],
      ],
    },
  },
};
