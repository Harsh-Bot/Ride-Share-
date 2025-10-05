import {
  ActionCodeSettings,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { validateEmailAgainstAllowlist } from '../../config/emailAllowlist';
import { dynamicLinkSettings } from './config';
import { getFirebaseAuth, getFirebaseFunctions } from './index';

const ensureHttpsDomain = (rawDomain: string) =>
  rawDomain.startsWith('http://') || rawDomain.startsWith('https://') ? rawDomain : `https://${rawDomain}`;

const buildMagicLinkUrl = (nonce: string) => {
  const sanitizedPath = dynamicLinkSettings.magicLinkPath.replace(/^\/+/, '');
  const url = new URL(`${ensureHttpsDomain(dynamicLinkSettings.domain)}/${sanitizedPath}`);
  url.searchParams.set('nonce', nonce);
  return url.toString();
};

const buildActionCodeSettings = (nonce: string): ActionCodeSettings => ({
  url: buildMagicLinkUrl(nonce),
  handleCodeInApp: true,
  dynamicLinkDomain: dynamicLinkSettings.domain,
  android: {
    packageName: dynamicLinkSettings.androidPackageName,
    installApp: true,
    minimumVersion: '1'
  },
  iOS: {
    bundleId: dynamicLinkSettings.iosBundleId
  }
});

export const sendMagicLink = async (email: string) => {
  const auth = getFirebaseAuth();
  const validation = validateEmailAgainstAllowlist(email);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const functions = getFirebaseFunctions();
  const prepareMagicLink = httpsCallable<{ email: string }, { nonce: string }>(functions, 'prepareMagicLink');
  const response = await prepareMagicLink({ email: validation.normalizedEmail });
  const nonce = (response.data as { nonce: string }).nonce;

  if (!nonce) {
    throw new Error('Unable to prepare magic link. Try again.');
  }

  await sendSignInLinkToEmail(auth, validation.normalizedEmail, buildActionCodeSettings(nonce));
  return validation.normalizedEmail;
};

export const verifyLink = async (link: string, email?: string) => {
  const auth = getFirebaseAuth();
  const trimmedLink = link.trim();
  if (!isSignInWithEmailLink(auth, trimmedLink)) {
    throw new Error('Invalid or expired sign-in link');
  }

  const signInEmail = email?.trim();
  if (!signInEmail) {
    throw new Error('Email address required to complete sign-in');
  }

  const credential = await signInWithEmailLink(auth, signInEmail, trimmedLink);
  return credential.user;
};

export const enforceRecentLogin = async (allowedAgeMinutes = 5) => {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  const lastSignInTime = user.metadata?.lastSignInTime;
  if (!lastSignInTime) {
    throw new Error('Unable to determine last sign-in time');
  }
  const lastSignInDate = new Date(lastSignInTime);
  const maxAge = allowedAgeMinutes * 60 * 1000;
  if (Date.now() - lastSignInDate.getTime() > maxAge) {
    throw new Error('Recent authentication required');
  }
};
