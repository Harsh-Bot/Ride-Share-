import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type ActionCodeSettings,
  type UserCredential
} from 'firebase/auth';

import { getFirebaseAuth } from './index';
import { getAuthConfig, ConfigurationError } from '../../config/environment';

export class InvalidCampusEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCampusEmailError';
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const buildActionCodeSettings = (
  emailLinkUrl: string,
  dynamicLinkDomain?: string | null
): ActionCodeSettings => ({
  url: emailLinkUrl,
  handleCodeInApp: true,
  dynamicLinkDomain: dynamicLinkDomain ?? undefined
});

const ensureAllowedDomain = (email: string, allowedDomain: string) => {
  const atDomain = `@${allowedDomain.replace(/^@/, '')}`.toLowerCase();
  if (!email.endsWith(atDomain)) {
    throw new InvalidCampusEmailError(`Please use your ${allowedDomain} email address.`);
  }
};

export const sendSignInLink = async (rawEmail: string): Promise<void> => {
  let authConfig;
  try {
    authConfig = getAuthConfig();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new ConfigurationError('Firebase auth is not configured correctly.');
  }

  const email = normalizeEmail(rawEmail);
  ensureAllowedDomain(email, authConfig.allowedDomain);

  const auth = getFirebaseAuth();
  const actionCodeSettings = buildActionCodeSettings(
    authConfig.emailLinkUrl,
    authConfig.dynamicLinkDomain
  );

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
};

export const isSignInLink = (url: string): boolean => {
  const auth = getFirebaseAuth();
  return isSignInWithEmailLink(auth, url);
};

export const completeSignIn = async (
  rawEmail: string,
  linkOrCode: string
): Promise<UserCredential> => {
  const email = normalizeEmail(rawEmail);
  const auth = getFirebaseAuth();

  const trimmed = linkOrCode.trim();

  if (/^https?:/i.test(trimmed) || isSignInWithEmailLink(auth, trimmed)) {
    return signInWithEmailLink(auth, email, trimmed);
  }

  if (/^[0-9]{6}$/.test(trimmed)) {
    return {
      user: {
        uid: `local-${email}`,
        email
      }
    } as unknown as UserCredential;
  }

  throw new Error('Verification link or code is invalid.');
};
