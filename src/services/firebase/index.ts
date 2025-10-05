import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from './config';

let appInstance: ReturnType<typeof initializeApp> | null = null;

export const getFirebaseApp = () => {
  if (!appInstance) {
    // TODO: Replace with guarded initialization to support Expo web/Native
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
};

export const getFirebaseAuth = () => getAuth(getFirebaseApp());
export const getFirestoreDb = () => getFirestore(getFirebaseApp());
export const getFirebaseFunctions = () => getFunctions(getFirebaseApp());
