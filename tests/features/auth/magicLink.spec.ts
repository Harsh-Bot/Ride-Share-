import '../../setup/playwrightRegister.js';
import { test, expect } from '@playwright/test';

import { getFirebaseAuth, __internal as firebaseInternal } from '../../../src/services/firebase';
import { sendMagicLink, verifyLink } from '../../../src/services/firebase/auth';
import {
  clearOutbox,
  waitForLatestOobLink,
  extractNonceFromLink,
  forceExpireMagicLink,
  EMULATOR_BASE_URL,
  PROJECT_ID,
  type EmulatorOobCode
} from './helpers/magicLinkTestUtils';

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

  test('completes sign-in without cached email when metadata is embedded', async () => {
    const email = `student+cross-device-${Date.now()}@sfu.ca`;

    await sendMagicLink(email);
    const oobEntry = await waitForLatestOobLink(email);

    // Simulate fresh device state with no cached email.
    firebaseInternal.resetAuthInstance();
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await auth.signOut();
    }

    await verifyLink(oobEntry.oobLink);

    expect(getFirebaseAuth().currentUser?.email).toBe(email);
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
