import * as admin from 'firebase-admin';

export const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'ride-share-dev';
export const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
export const EMULATOR_BASE_URL = AUTH_EMULATOR_HOST.startsWith('http')
  ? AUTH_EMULATOR_HOST
  : `http://${AUTH_EMULATOR_HOST}`;

export type EmulatorOobCode = {
  oobCode: string;
  oobLink: string;
  email: string;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const clearOutbox = async () => {
  await fetch(`${EMULATOR_BASE_URL}/emulator/v1/projects/${PROJECT_ID}/oobCodes`, {
    method: 'DELETE'
  });
};

export const waitForLatestOobLink = async (email: string, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(
      `${EMULATOR_BASE_URL}/emulator/v1/projects/${PROJECT_ID}/oobCodes`
    );
    if (!response.ok) {
      throw new Error(`Failed to read emulator outbox: ${response.status}`);
    }
    const payload = (await response.json()) as { oobCodes?: EmulatorOobCode[] };
    const match = payload.oobCodes?.find(code => code.email === email);
    if (match) {
      return match;
    }
    await sleep(150);
  }

  throw new Error(`Timed out waiting for magic link for ${email}`);
};

export const extractNonceFromLink = (link: string): string | null => {
  try {
    const parsed = new URL(link);
    const continueUrlParam = parsed.searchParams.get('continueUrl');
    if (!continueUrlParam) {
      return null;
    }
    const continueUrl = new URL(continueUrlParam);
    return continueUrl.searchParams.get('nonce');
  } catch (error) {
    console.error('Failed to extract nonce', error);
    return null;
  }
};

let adminInitialized = false;

const getAdminDb = () => {
  if (!adminInitialized) {
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    const db = admin.firestore();
    db.settings({ host: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080', ssl: false });
    adminInitialized = true;
  }
  return admin.firestore();
};

export const forceExpireMagicLink = async (nonce: string) => {
  const db = getAdminDb();
  await db.collection('magicLinkRequests').doc(nonce).update({
    issuedAt: Date.now() - 20 * 60 * 1000
  });
};
