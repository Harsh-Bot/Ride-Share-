import { getFirebaseAuth } from './index';

export const sendMagicLink = async (_email: string) => {
  // TODO: Implement Firebase passwordless email link flow with App Check
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
};

export const verifyLink = async (_link: string) => {
  // TODO: Implement incoming dynamic link validation and session persistence
};

export const enforceRecentLogin = async () => {
  // TODO: Trigger re-authentication before sensitive actions (e.g., incentive claim)
};
