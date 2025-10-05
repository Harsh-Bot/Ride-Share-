/* @jsxRuntime automatic */
/* @jsxImportSource react */
import '../../setup/playwrightRegister.js';
import { test, expect } from '@playwright/test';
import TestRenderer, { act } from 'react-test-renderer';
import React from 'react';

import { AuthProvider } from '../../../src/contexts/AuthContext';
import { useAuth } from '../../../src/hooks/useAuth';
import { clearPendingEmail } from '../../../src/features/auth/storage';
import { setToastObserver } from '../../../src/utils/toast';
import { getFirebaseAuth, __internal as firebaseInternal } from '../../../src/services/firebase';
import {
  clearOutbox,
  waitForLatestOobLink,
  extractNonceFromLink,
  forceExpireMagicLink
} from './helpers/magicLinkTestUtils';

const createAuthHarness = async () => {
  let latestContext: ReturnType<typeof useAuth> | null = null;
  let renderer: TestRenderer.ReactTestRenderer;

  const Capture = () => {
    latestContext = useAuth();
    return null;
  };

  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(AuthProvider, null, React.createElement(Capture))
    );
  });


  await act(async () => {
    await Promise.resolve();
  });

  return {
    getContext: () => {
      if (!latestContext) {
        throw new Error('Auth context not ready');
      }
      return latestContext;
    },
    dispose: () => {
      renderer.unmount();
    }
  };
};

test.describe('Magic link UI toasts', () => {
  test.beforeEach(async () => {
    firebaseInternal.resetAuthInstance();
    await clearOutbox();
    await clearPendingEmail();
    setToastObserver(null);
  });

  test.afterEach(async () => {
    setToastObserver(null);
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await auth.signOut();
    }
  });

  test('shows success toast after completing magic link sign-in', async () => {
    const email = `student+ui-success-${Date.now()}@sfu.ca`;
    const harness = await createAuthHarness();

    try {
      await act(async () => {
        await harness.getContext().initiateSignIn(email);
      });
      const oobEntry = await waitForLatestOobLink(email);

      const toasts: { message: string; type: string }[] = [];
      setToastObserver((message, type) => {
        toasts.push({ message, type });
      });

      await act(async () => {
        await harness.getContext().completeSignIn(oobEntry.oobLink);
      });

      const lastToast = toasts[toasts.length - 1];
      expect(lastToast?.type).toBe('success');
      expect(lastToast?.message).toBe('Signed in successfully');
    } finally {
      harness.dispose();
      setToastObserver(null);
    }
  });

  test('shows error toast when reusing a magic link', async () => {
    const email = `student+ui-reuse-${Date.now()}@sfu.ca`;

    const initialHarness = await createAuthHarness();
    const oobEntry = await (async () => {
      try {
        await act(async () => {
          await initialHarness.getContext().initiateSignIn(email);
        });
        const entry = await waitForLatestOobLink(email);
        await act(async () => {
          await initialHarness.getContext().completeSignIn(entry.oobLink);
        });
        return entry;
      } finally {
        initialHarness.dispose();
        setToastObserver(null);
      }
    })();

    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await auth.signOut();
    }
    firebaseInternal.resetAuthInstance();

    const reuseHarness = await createAuthHarness();
    const toasts: { message: string; type: string }[] = [];
    setToastObserver((message, type) => {
      toasts.push({ message, type });
    });

    try {
      await act(async () => {
        await expect(reuseHarness.getContext().completeSignIn(oobEntry.oobLink)).rejects.toThrow(/used|expired/i);
      });

      const lastToast = toasts[toasts.length - 1];
      expect(lastToast?.type).toBe('error');
      expect(lastToast?.message.toLowerCase()).toContain('used');
    } finally {
      reuseHarness.dispose();
      setToastObserver(null);
    }
  });

  test('shows error toast when magic link is expired', async () => {
    const email = `student+ui-expired-${Date.now()}@sfu.ca`;
    const harness = await createAuthHarness();

    try {
      await act(async () => {
        await harness.getContext().initiateSignIn(email);
      });
      const oobEntry = await waitForLatestOobLink(email);
      const nonce = extractNonceFromLink(oobEntry.oobLink);
      expect(nonce).toBeTruthy();
      if (nonce) {
        await forceExpireMagicLink(nonce);
      }

      const toasts: { message: string; type: string }[] = [];
      setToastObserver((message, type) => {
        toasts.push({ message, type });
      });

      await act(async () => {
        await expect(harness.getContext().completeSignIn(oobEntry.oobLink)).rejects.toThrow(/expired/i);
      });

      const lastToast = toasts[toasts.length - 1];
      expect(lastToast?.type).toBe('error');
      expect(lastToast?.message.toLowerCase()).toContain('expired');
    } finally {
      harness.dispose();
      setToastObserver(null);
    }
  });
});
