import Constants from 'expo-constants';

type ExpoExtra = Record<string, unknown> | undefined;

const expoConfig = Constants?.expoConfig ?? Constants?.manifest;
const extra = (expoConfig?.extra ?? {}) as ExpoExtra & {
  firebase?: Record<string, string>;
};

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const getFromExtra = (key: string) => readString(extra?.firebase?.[key]);

const toEnvKey = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/-/g, '_').toUpperCase();

const getEnv = (key: string) => {
  const envKey = `EXPO_PUBLIC_${key}`;
  const value = process.env[envKey];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const getRequiredConfig = (key: string, fallback?: string) => {
  const fromEnv = getEnv(`FIREBASE_${toEnvKey(key)}`);
  if (fromEnv) {
    return fromEnv;
  }
  const fromExtra = getFromExtra(key);
  if (fromExtra) {
    return fromExtra;
  }
  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }
  throw new Error(
    `Missing Firebase configuration value for "${key}". ` +
      'Set EXPO_PUBLIC_FIREBASE_' +
      key.toUpperCase() +
      ' or define expo.extra.firebase.' +
      key
  );
};

const getOptionalConfig = (key: string, fallback?: string) => {
  const fromEnv = getEnv(`FIREBASE_${toEnvKey(key)}`);
  if (fromEnv) {
    return fromEnv;
  }
  const fromExtra = getFromExtra(key);
  if (fromExtra) {
    return fromExtra;
  }
  return fallback;
};

export const firebaseConfig = {
  apiKey: getRequiredConfig('apiKey'),
  authDomain: getRequiredConfig('authDomain'),
  projectId: getRequiredConfig('projectId'),
  storageBucket: getRequiredConfig('storageBucket'),
  messagingSenderId: getRequiredConfig('messagingSenderId'),
  appId: getRequiredConfig('appId'),
  measurementId: getOptionalConfig('measurementId')
};

const defaultDynamicLinkDomain = getOptionalConfig('dynamicLinkDomain', 'sfurideshare.page.link');
const defaultMagicLinkPath = getOptionalConfig('magicLinkPath', 'auth/verify');

const iosBundleId = getEnv('IOS_BUNDLE_ID') ?? readString(expoConfig?.ios?.bundleIdentifier) ?? 'ca.sfu.rideshare';
const androidPackageName =
  getEnv('ANDROID_PACKAGE_NAME') ?? readString(expoConfig?.android?.package) ?? 'ca.sfu.rideshare';

export const dynamicLinkSettings = {
  domain: defaultDynamicLinkDomain,
  magicLinkPath: defaultMagicLinkPath,
  iosBundleId,
  androidPackageName
};
