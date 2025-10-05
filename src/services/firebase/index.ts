import { getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  setPersistence
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { firebaseConfig } from './config';

let appInstance: ReturnType<typeof initializeApp> | null = null;
let authInstance: Auth | null = null;
let authEmulatorConfigured = false;
let functionsInstance: ReturnType<typeof getFunctions> | null = null;
let functionsEmulatorConfigured = false;

type ReactNativePersistenceFactory = typeof import('firebase/auth/react-native')['getReactNativePersistence'];

let cachedNativePersistenceFactory: ReactNativePersistenceFactory | null = null;

const resolveReactNativePersistence = (): ReactNativePersistenceFactory | null => {
  if (cachedNativePersistenceFactory !== null) {
    return cachedNativePersistenceFactory;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedNativePersistenceFactory = require('firebase/auth/react-native').getReactNativePersistence;
  } catch (error) {
    cachedNativePersistenceFactory = null;
  }
  return cachedNativePersistenceFactory;
};

export const getFirebaseApp = () => {
  if (!appInstance) {
    const existingApp = getApps()[0];
    appInstance = existingApp ?? initializeApp(firebaseConfig);
  }
  return appInstance;
};

const createAuthInstance = (app: ReturnType<typeof initializeApp>): Auth => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const nativePersistenceFactory = resolveReactNativePersistence();
    if (!nativePersistenceFactory) {
      return initializeAuth(app);
    }
    return initializeAuth(app, {
      persistence: nativePersistenceFactory(AsyncStorage)
    });
  }

  const defaultAuth = getAuth(app);
  if (typeof window === 'undefined') {
    void setPersistence(defaultAuth, inMemoryPersistence);
  } else {
    void setPersistence(defaultAuth, browserLocalPersistence);
  }
  return defaultAuth;
};

export const getFirebaseAuth = () => {
  if (!authInstance) {
    authInstance = createAuthInstance(getFirebaseApp());
    const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    if (emulatorHost && !authEmulatorConfigured) {
      const emulatorUrl = emulatorHost.startsWith('http') ? emulatorHost : `http://${emulatorHost}`;
      try {
        connectAuthEmulator(authInstance, emulatorUrl, { disableWarnings: true });
      } catch (error) {
        if ((error as { code?: string })?.code !== 'auth/emulator-config-failed') {
          throw error;
        }
      }
      authEmulatorConfigured = true;
    }
  }
  return authInstance;
};

export const getFirestoreDb = () => getFirestore(getFirebaseApp());
export const getFirebaseFunctions = () => {
  if (!functionsInstance) {
    functionsInstance = getFunctions(getFirebaseApp());
    const emulatorHost = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST;
    if (emulatorHost && !functionsEmulatorConfigured) {
      const url = emulatorHost.startsWith('http') ? new URL(emulatorHost) : new URL(`http://${emulatorHost}`);
      connectFunctionsEmulator(functionsInstance, url.hostname, Number(url.port || 5001));
      functionsEmulatorConfigured = true;
    }
  }
  return functionsInstance;
};

export const __internal = {
  resetAuthInstance: () => {
    authInstance = null;
    authEmulatorConfigured = false;
    functionsInstance = null;
    functionsEmulatorConfigured = false;
  }
};
