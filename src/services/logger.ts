// Canonical app logger.
//
// Responsibilities:
//   - Single choke point for all diagnostic output. Every screen/hook
//     should import from here (or via the back-compat shim in
//     src/utils/logger.ts) instead of calling `console.*` directly.
//   - Production-safe: log/info/debug/warn are gated behind __DEV__ so
//     release bundles emit nothing for ordinary tracing. babel-plugin-
//     transform-remove-console (configured in babel.config.js for the
//     production env) deletes any leftover raw `console.log` calls as a
//     second line of defense.
//   - Crashlytics-aware: `error` ALWAYS emits and records to
//     Crashlytics if Firebase is wired in. `logEvent` mirrors to
//     Crashlytics breadcrumbs.
//   - `setUserId` lets us correlate sessions in the Firebase console
//     once the user logs in.
//
// Crashlytics is required lazily so the build still works on dev
// machines without google-services.json (the build.gradle gates the
// plugin on its presence).

type LogArgs = readonly unknown[];

interface CrashlyticsInstance {
  setAttribute: (key: string, value: string) => void;
  recordError: (err: Error) => void;
  setUserId: (id: string) => void;
  log: (msg: string) => void;
}
type CrashlyticsModule = () => CrashlyticsInstance;

let crashlyticsModule: CrashlyticsModule | null = null;
try {
  // require() instead of import so missing Firebase doesn't break the
  // bundle on developer machines without google-services.json.
  crashlyticsModule = require('@react-native-firebase/crashlytics').default;
} catch {
  // Firebase not linked yet — Crashlytics calls become no-ops.
}

const safeCrash = (fn: (c: CrashlyticsInstance) => void) => {
  if (!crashlyticsModule) return;
  try {
    fn(crashlyticsModule());
  } catch {
    // Crashlytics itself failed; never propagate.
  }
};

const isDev = __DEV__;

export const logger = {
  log: (...args: LogArgs) => {
    if (isDev) console.log('[AppLog]', ...args);
  },

  info: (...args: LogArgs) => {
    if (isDev) console.info('[AppInfo]', ...args);
  },

  warn: (...args: LogArgs) => {
    if (isDev) console.warn('[AppWarn]', ...args);
  },

  debug: (...args: LogArgs) => {
    if (isDev) console.debug('[AppDebug]', ...args);
  },

  // `error` always emits and forwards to Crashlytics. Variadic so
  // existing callsites like `console.error('msg:', err)` migrate
  // 1-for-1. Crashlytics gets the first Error instance in args; if
  // none present we synthesise one from the first string. Optional
  // context (a string ending with the conventional `:` will be picked
  // up automatically) attaches as an attribute for grouping.
  error: (...args: LogArgs) => {
    if (isDev) console.error('[AppError]', ...args);

    const firstError = args.find(
      (a): a is Error => a instanceof Error,
    );
    const firstString = args.find(
      (a): a is string => typeof a === 'string',
    );
    const errorObj =
      firstError ?? new Error(firstString ?? 'Unknown error');

    safeCrash(c => {
      if (firstString) c.setAttribute('error_context', firstString);
      c.recordError(errorObj);
    });
  },

  setUserId: (userId: string) => {
    if (isDev) console.log('[AppLog] setUserId', userId);
    safeCrash(c => c.setUserId(userId));
  },

  logEvent: (name: string, params?: Record<string, unknown>) => {
    if (isDev) console.log('[AppEvent]', name, params);
    safeCrash(c => c.log(`Event: ${name} - ${JSON.stringify(params ?? {})}`));
  },
};

export type Logger = typeof logger;
