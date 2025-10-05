// Dynamic Expo config to hydrate firebase settings from environment variables or defaults.
const fs = require('fs');
const path = require('path');

const { expo: baseConfig } = require('./app.json');

const loadEnvFiles = () => {
  try {
    // Prefer local overrides last without clobbering already defined variables.
    const dotenv = require('dotenv');
    const candidates = [
      '.env',
      `.env.${process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development'}`,
      '.env.local'
    ];

    for (const file of candidates) {
      const filePath = path.resolve(__dirname, file);
      if (fs.existsSync(filePath)) {
        dotenv.config({ path: filePath, override: false });
      }
    }
  } catch (error) {
    // dotenv is an optional convenience; ignore when unavailable.
  }
};

const camelToEnv = key => `EXPO_PUBLIC_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;

const getEnvVar = key => {
  const value = process.env[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
};

const firebaseDefaults = {
  apiKey: 'demo-api-key',
  authDomain: 'localhost',
  projectId: 'demo-no-project',
  storageBucket: 'demo-no-project.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef123456',
  measurementId: 'G-TEST123',
  dynamicLinkDomain: 'sfurideshare.page.link',
  magicLinkPath: 'auth/verify'
};

const emulatorEnvMap = {
  FIREBASE_AUTH_EMULATOR_HOST: 'authEmulatorHost',
  FIREBASE_FUNCTIONS_EMULATOR_HOST: 'functionsEmulatorHost',
  FIRESTORE_EMULATOR_HOST: 'firestoreEmulatorHost'
};

const emulatorDefaults = {
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5001',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080'
};

module.exports = ({ config }) => {
  loadEnvFiles();

  const isDevelopment = process.env.APP_ENV === 'development'
    || process.env.NODE_ENV !== 'production';

  const resolvedFirebase = {
    ...firebaseDefaults,
    ...(baseConfig.extra?.firebase ?? {}),
    ...(config?.extra?.firebase ?? {})
  };

  for (const key of Object.keys(firebaseDefaults)) {
    const envKey = camelToEnv(`firebase${key[0].toUpperCase()}${key.slice(1)}`);
    const candidate = process.env[envKey];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      resolvedFirebase[key] = candidate.trim();
    }
  }

  const emulatorSettings = {};

  for (const [envKey, configKey] of Object.entries(emulatorEnvMap)) {
    const expoKey = `EXPO_PUBLIC_${envKey}`;
    const resolved = getEnvVar(expoKey)
      ?? getEnvVar(envKey)
      ?? (isDevelopment ? emulatorDefaults[envKey] : undefined);

    if (resolved && !getEnvVar(expoKey)) {
      process.env[expoKey] = resolved;
    }

    if (resolved) {
      emulatorSettings[configKey] = resolved;
    }
  }

  const iosBundleIdEnv = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID;
  const androidPackageEnv = process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME;

  const merged = {
    ...baseConfig,
    ...config,
    ios: {
      ...baseConfig.ios,
      ...config?.ios,
      bundleIdentifier: iosBundleIdEnv?.trim() || config?.ios?.bundleIdentifier || baseConfig.ios?.bundleIdentifier
    },
    android: {
      ...baseConfig.android,
      ...config?.android,
      package: androidPackageEnv?.trim() || config?.android?.package || baseConfig.android?.package
    },
    extra: {
      ...baseConfig.extra,
      ...config?.extra,
      firebase: {
        ...resolvedFirebase,
        ...emulatorSettings
      }
    }
  };

  return merged;
};
