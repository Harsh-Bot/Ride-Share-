import { sendSignInLink, completeSignIn } from '../auth';
import { getAuthEmulatorConfig } from '../../../config/environment';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const emulatorConfig = getAuthEmulatorConfig();

if (!emulatorConfig) {
  test.skip('Firebase Auth emulator integration (emulator disabled)', () => undefined);
} else {
  const { host, port, projectId } = emulatorConfig;
  const oobUrl = `http://${host}:${port}/emulator/v1/projects/${projectId}/oobCodes`;
  const email = `student+${Date.now()}@sfu.ca`;

  const fetchOobCodes = async () => {
    const res = await fetch(oobUrl);
    if (!res.ok) {
      throw new Error(`Failed to read OOB codes: ${res.status}`);
    }
    return (await res.json()) as { oobCodes: Array<{ email: string; oobLink?: string }> };
  };

  const waitForEmailLink = async (targetEmail: string) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const payload = await fetchOobCodes();
      const match = payload.oobCodes.find((code) => code.email === targetEmail && code.oobLink);
      if (match?.oobLink) {
        return match.oobLink;
      }
      await sleep(500);
    }
    throw new Error('Timed out waiting for emulator email link');
  };

  describe('Firebase Auth emulator integration', () => {
    let emulatorAvailable = true;

    beforeAll(async () => {
      if (!process.env.FIREBASE_EMAIL_LINK_URL) {
        process.env.FIREBASE_EMAIL_LINK_URL = 'http://localhost:19006/auth';
      }
      try {
        await fetch(oobUrl, { method: 'DELETE' });
        await fetchOobCodes();
      } catch (error) {
        emulatorAvailable = false;
        console.warn('[auth-emulator] Unable to reach Firebase Auth emulator, skipping integration test.', error);
      }
    });

    it('sends sign-in link and completes sign-in via emulator', async () => {
      if (!emulatorAvailable) {
        return;
      }

      await sendSignInLink(email);
      const link = await waitForEmailLink(email);
      const credential = await completeSignIn(email, link);
      expect(credential.user?.email).toBe(email);
    });
  });
}
