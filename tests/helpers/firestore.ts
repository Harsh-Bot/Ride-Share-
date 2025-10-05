import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
  Timestamp
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';

export type EmulatorContext = {
  app: FirebaseApp;
  db: Firestore;
  uid: string;
};

export const initEmulator = async (): Promise<EmulatorContext | null> => {
  const hostEnv = process.env.FIRESTORE_EMULATOR_HOST;
  if (!hostEnv) return null;

  const [host, portStr] = hostEnv.split(':');
  const port = Number(portStr ?? 8080);

  const app = initializeApp({ projectId: 'ride-share-dev' });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host || '127.0.0.1', Number.isFinite(port) ? port : 8080);

  // Try to attach auth if emulator host provided
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const auth = getAuth(app);
  if (authHost) {
    const [aHost, aPortStr] = authHost.split(':');
    connectAuthEmulator(auth, `http://${aHost || '127.0.0.1'}:${Number(aPortStr ?? 9099)}`);
  }
  const cred = await signInAnonymously(auth);
  return { app, db, uid: cred.user.uid };
};

export { Timestamp };

