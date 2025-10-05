import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from './config';
import { getAuthEmulatorConfig } from '../../config/environment';

let appInstance: ReturnType<typeof initializeApp> | null = null;
let authInstance: ReturnType<typeof getAuth> | null = null;

export const getFirebaseApp = () => {
  if (!appInstance) {
    // TODO: Replace with guarded initialization to support Expo web/Native
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
};

export const getFirebaseAuth = () => {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
    const emulator = getAuthEmulatorConfig();
    if (emulator) {
      const emulatorUrl = `http://${emulator.host}:${emulator.port}`;
      try {
        connectAuthEmulator(authInstance, emulatorUrl, { disableWarnings: true });
      } catch (error) {
        console.warn('[firebase] Failed to connect auth emulator', error);
      }
    }
  }

  return authInstance;
};
export const getFirestoreDb = () => getFirestore(getFirebaseApp());
export const getFirebaseFunctions = () => getFunctions(getFirebaseApp());
