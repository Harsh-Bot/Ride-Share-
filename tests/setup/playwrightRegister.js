const Module = require('module');
const path = require('path');

require('esbuild-register/dist/node').register({
  extensions: ['.ts', '.tsx'],
  jsx: 'automatic',
  jsxImportSource: 'react'
});

const ensureEnv = (key, fallback) => {
  if (!process.env[key]) {
    process.env[key] = fallback;
  }
};

ensureEnv('EXPO_PUBLIC_FIREBASE_API_KEY', 'demo-api-key');
ensureEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'localhost');
ensureEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'demo-no-project');
ensureEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'demo-no-project.appspot.com');
ensureEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '1234567890');
ensureEnv('EXPO_PUBLIC_FIREBASE_APP_ID', '1:1234567890:web:abcdef123456');
ensureEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', 'G-TEST123');
ensureEnv('EXPO_PUBLIC_FIREBASE_DYNAMIC_LINK_DOMAIN', 'sfurideshare.page.link');
ensureEnv('EXPO_PUBLIC_FIREBASE_MAGIC_LINK_PATH', 'auth/verify');
ensureEnv('EXPO_PUBLIC_IOS_BUNDLE_ID', 'ca.sfu.rideshare');
ensureEnv('EXPO_PUBLIC_ANDROID_PACKAGE_NAME', 'ca.sfu.rideshare');
ensureEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
ensureEnv('ALLOWED_EMAIL_DOMAINS', 'sfu.ca,cs.sfu.ca');
ensureEnv('FIREBASE_FUNCTIONS_EMULATOR_HOST', '127.0.0.1:5001');
ensureEnv('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080');
ensureEnv('FIREBASE_EMULATOR_LOG_PATH', path.resolve(__dirname, '..', '..', 'logs', 'firebase-debug.log'));

const memoryStore = new Map();

const secureStoreMock = {
  isAvailableAsync: async () => true,
  async setItemAsync(key, value) {
    memoryStore.set(key, value);
  },
  async getItemAsync(key) {
    return memoryStore.get(key) ?? null;
  },
  async deleteItemAsync(key) {
    memoryStore.delete(key);
  }
};

const asyncStorageMock = {
  async setItem(key, value) {
    memoryStore.set(key, value);
    return null;
  },
  async getItem(key) {
    return memoryStore.get(key) ?? null;
  },
  async removeItem(key) {
    memoryStore.delete(key);
    return null;
  }
};

const reactNativeMock = {
  Platform: { OS: 'web' },
  Alert: { alert: () => {} },
  ToastAndroid: { SHORT: 0, show: () => {} }
};

const expoConstantsMock = {
  expoConfig: {
    ios: { bundleIdentifier: 'ca.sfu.rideshare' },
    android: { package: 'ca.sfu.rideshare' },
    extra: {
      firebase: {},
      eas: {}
    }
  }
};

const moduleAliases = new Map([
  ['expo-secure-store', () => secureStoreMock],
  ['@react-native-async-storage/async-storage', () => asyncStorageMock],
  ['react-native', () => reactNativeMock],
  ['expo-constants', () => expoConstantsMock],
  ['expo-modules-core', () => ({})],
  [
    'expo-linking',
    () => ({
      createURL: (path = '') => `https://sfurideshare.test/${path.replace(/^\/+/, '')}`,
      getInitialURL: async () => null,
      addEventListener: (_event, handler) => ({
        remove: () => {
          if (typeof handler === 'function') {
            // no-op removal stub
          }
        }
      })
    })
  ]
]);

const originalRequire = Module.prototype.require;

Module.prototype.require = function patchedRequire(request) {
  if (moduleAliases.has(request)) {
    return moduleAliases.get(request)();
  }
  if (request.startsWith('expo-modules-core/')) {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

try {
  const reactJsxRuntime = require('react/jsx-runtime');
  const reactJsxDevRuntime = require('react/jsx-dev-runtime');
  const playwrightJsxRuntimePath = require.resolve('playwright/jsx-runtime');
  const playwrightJsxDevRuntimePath = require.resolve('playwright/jsx-dev-runtime');
  require.cache[playwrightJsxRuntimePath] = {
    id: playwrightJsxRuntimePath,
    filename: playwrightJsxRuntimePath,
    loaded: true,
    exports: reactJsxRuntime
  };
  require.cache[playwrightJsxDevRuntimePath] = {
    id: playwrightJsxDevRuntimePath,
    filename: playwrightJsxDevRuntimePath,
    loaded: true,
    exports: reactJsxDevRuntime
  };
} catch (error) {
  // ignore if playwright jsx runtime resolution fails
}

process.env.PLAYWRIGHT_REGISTER_LOADED = 'true';

module.exports = {};
