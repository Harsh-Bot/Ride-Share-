import { getFirebaseRuntimeConfig } from '../../config/environment';

const runtimeConfig = getFirebaseRuntimeConfig();

export const firebaseConfig = {
  apiKey: runtimeConfig.apiKey ?? 'TODO',
  authDomain: runtimeConfig.authDomain ?? 'TODO',
  projectId: runtimeConfig.projectId ?? 'TODO',
  storageBucket: 'TODO',
  messagingSenderId: 'TODO',
  appId: 'TODO',
  measurementId: 'TODO'
};
