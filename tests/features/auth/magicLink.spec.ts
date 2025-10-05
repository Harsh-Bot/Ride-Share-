import '../../setup/playwrightRegister.js';
import { test, expect } from '@playwright/test';
import * as admin from 'firebase-admin';

import { getFirebaseAuth, __internal as firebaseInternal } from '../../../src/services/firebase';
import { sendMagicLink, verifyLink } from '../../../src/services/firebase/auth';

const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'ride-share-dev';
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const EMULATOR_BASE_URL = AUTH_EMULATOR_HOST.startsWith('http')
  ? AUTH_EMULATOR_HOST
  : `http://${AUTH_EMULATOR_HOST}`;

type EmulatorOobCode = {
  oobCode: string;
  oobLink: string;
  email: string;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const clearOutbox = async () => {
  await fetch(`${EMULATOR_BASE_URL}/emulator/v1/projects/${PROJECT_ID}/oobCodes`, {
    method: 'DELETE'
  });
};

const waitForLatestOobLink = async (email: string, timeoutMs = 5000) => {
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

const extractNonceFromLink = (link: string): string | null => {
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

const forceExpireMagicLink = async (nonce: string) => {
  const db = getAdminDb();
  await db.collection('magicLinkRequests').doc(nonce).update({
    issuedAt: Date.now() - 20 * 60 * 1000
  });
};

test.describe('Magic link authentication', () => {
  test.beforeEach(async () => {
    firebaseInternal.resetAuthInstance();
    await clearOutbox();
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await auth.signOut();
    }
  });

  test('sends link, retrieves from emulator outbox, completes sign-in', async () => {
    const email = `student+${Date.now()}@sfu.ca`;

    await sendMagicLink(email);
    const oobEntry = await waitForLatestOobLink(email);

    expect(oobEntry.oobLink).toContain('sfurideshare.page.link');
    expect(oobEntry.oobLink).toContain('mode=signIn');

    await verifyLink(oobEntry.oobLink, email);

    const auth = getFirebaseAuth();
    expect(auth.currentUser?.email).toBe(email);
  });

  test('persists auth session across auth instance re-creation', async () => {
    const email = `student+persist-${Date.now()}@sfu.ca`;

    await sendMagicLink(email);
    const oobEntry = await waitForLatestOobLink(email);
    await verifyLink(oobEntry.oobLink, email);

    let auth = getFirebaseAuth();
    expect(auth.currentUser?.email).toBe(email);

    // Simulate app restart by resetting the cached instance before fetching auth again.
    firebaseInternal.resetAuthInstance();
    auth = getFirebaseAuth();
    expect(auth.currentUser?.email).toBe(email);
  });

  test('rejects non-SFU domains before sending magic link', async () => {
    const email = `intruder+${Date.now()}@gmail.com`;

    await expect(sendMagicLink(email)).rejects.toThrow('Use your SFU email');

    const response = await fetch(`${EMULATOR_BASE_URL}/emulator/v1/projects/${PROJECT_ID}/oobCodes`);
    expect(response.ok).toBe(true);
    const payload = (await response.json()) as { oobCodes?: EmulatorOobCode[] };
    const match = payload.oobCodes?.find(code => code.email === email);
    expect(match).toBeUndefined();
  });

  test('prevents magic link reuse', async () => {
    const email = `student+reuse-${Date.now()}@sfu.ca`;

    await sendMagicLink(email);
    const oobEntry = await waitForLatestOobLink(email);
    await verifyLink(oobEntry.oobLink, email);

    const auth = getFirebaseAuth();
    await auth.signOut();
    firebaseInternal.resetAuthInstance();

    await expect(verifyLink(oobEntry.oobLink, email)).rejects.toThrow(/used|expired/i);
  });

  test('fails when magic link is past TTL', async () => {
    const email = `student+ttl-${Date.now()}@sfu.ca`;

    await sendMagicLink(email);
    const oobEntry = await waitForLatestOobLink(email);
    const nonce = extractNonceFromLink(oobEntry.oobLink);
    expect(nonce).toBeTruthy();

    if (nonce) {
      await forceExpireMagicLink(nonce);
    }

    await expect(verifyLink(oobEntry.oobLink, email)).rejects.toThrow(/expired/i);
  });
});
