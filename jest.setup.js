/* eslint-env jest */
/**
 * Jest setup — mocks native modules that fail when loaded outside the
 * RN runtime. Keeps __tests__/App.test.tsx and any future smoke tests green.
 *
 * Add new mocks here whenever you import another native module from App.tsx
 * or any top-level provider so Jest can require it without a real device.
 */

jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: {
    hide: jest.fn().mockResolvedValue(undefined),
    show: jest.fn().mockResolvedValue(undefined),
    getVisibilityStatus: jest.fn().mockResolvedValue('hidden'),
    isVisible: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: () => ({
    recordError: jest.fn(),
    setAttribute: jest.fn(),
    setUserId: jest.fn(),
    log: jest.fn(),
  }),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({}),
    signOut: jest.fn().mockResolvedValue(undefined),
    getTokens: jest.fn().mockResolvedValue({ accessToken: 'test-token' }),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    isSupported: false,
    performRequest: jest.fn().mockResolvedValue({}),
    Operation: { LOGIN: 'LOGIN', LOGOUT: 'LOGOUT' },
    Scope: { EMAIL: 'EMAIL', FULL_NAME: 'FULL_NAME' },
    Error: { CANCELED: 'CANCELED' },
  },
}));

jest.mock('react-native-iap', () => ({
  initConnection: jest.fn().mockResolvedValue(true),
  endConnection: jest.fn().mockResolvedValue(true),
  fetchProducts: jest.fn().mockResolvedValue([]),
  requestPurchase: jest.fn().mockResolvedValue(undefined),
  getAvailablePurchases: jest.fn().mockResolvedValue([]),
  finishTransaction: jest.fn().mockResolvedValue(undefined),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('react-native-nitro-sound', () => ({
  __esModule: true,
  default: {
    startRecorder: jest.fn(),
    stopRecorder: jest.fn(),
    startPlayer: jest.fn(),
    stopPlayer: jest.fn(),
    addRecordBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
    addPlayBackListener: jest.fn(),
    removePlayBackListener: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn().mockResolvedValue({ assets: [] }),
  launchImageLibrary: jest.fn().mockResolvedValue({ assets: [] }),
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  return {
    __esModule: true,
    WebView: React.forwardRef((props, _ref) =>
      React.createElement('RNCWebView', props),
    ),
    default: React.forwardRef((props, _ref) =>
      React.createElement('RNCWebView', props),
    ),
  };
});

jest.mock('react-native-youtube-iframe', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props, _ref) =>
      React.createElement('YoutubePlayer', props),
    ),
  };
});

jest.mock('react-native-video', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props, _ref) =>
      React.createElement('Video', props),
    ),
  };
});

jest.mock('react-native-image-viewing', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: props =>
      props.visible ? React.createElement('ImageView', props) : null,
  };
});

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/tmp',
  DocumentDirectoryPath: '/tmp',
  exists: jest.fn().mockResolvedValue(false),
  unlink: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(''),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => () => {}),
    fetch: jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    }),
  },
}));

jest.mock('react-native-permissions', () => ({
  check: jest.fn().mockResolvedValue('granted'),
  request: jest.fn().mockResolvedValue('granted'),
  checkMultiple: jest.fn().mockResolvedValue({}),
  requestMultiple: jest.fn().mockResolvedValue({}),
  openSettings: jest.fn().mockResolvedValue(undefined),
  PERMISSIONS: {
    IOS: { MICROPHONE: 'ios.permission.MICROPHONE' },
    ANDROID: { RECORD_AUDIO: 'android.permission.RECORD_AUDIO' },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
    LIMITED: 'limited',
  },
}));

// Inline AsyncStorage mock — v3.x of @react-native-async-storage/async-storage
// no longer ships the `/jest/async-storage-mock` entry, so we provide a
// minimal in-memory implementation that covers the API surface used by the app.
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = new Map();
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
      getItem: jest.fn(async key => store.get(key) ?? null),
      removeItem: jest.fn(async key => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
      multiGet: jest.fn(async keys =>
        keys.map(k => [k, store.get(k) ?? null]),
      ),
      multiSet: jest.fn(async pairs => {
        pairs.forEach(([k, v]) => store.set(k, v));
      }),
      multiRemove: jest.fn(async keys => {
        keys.forEach(k => store.delete(k));
      }),
    },
  };
});
