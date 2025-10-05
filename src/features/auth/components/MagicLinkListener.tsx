import { useEffect } from 'react';
import * as Linking from 'expo-linking';

import { useAuth } from '../../../hooks/useAuth';
import { isSignInLink } from '../../../services/firebase/auth';

// Passive listener that attempts to complete Firebase Email Link sign-in
// whenever the app is opened via a magic link while a pending email exists.
export const MagicLinkListener = () => {
  const { pendingEmail, completeSignIn, authError } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const handleUrl = async (url: string | null) => {
      if (!url || !pendingEmail) return;
      try {
        if (isSignInLink(url)) {
          await completeSignIn(url);
        }
      } catch (e) {
        // Surface via existing authError state; swallow here to avoid unhandled rejections
        // eslint-disable-next-line no-console
        console.warn('[auth] magic link completion failed', (e as Error).message || e);
      }
    };

    // Initial URL (cold start or browser refresh on web)
    Linking.getInitialURL().then((initial) => {
      if (isMounted) handleUrl(initial);
    });

    // Runtime events (foreground app)
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      isMounted = false;
      // Remove listener if supported by current expo-linking version
      (sub as unknown as { remove?: () => void }).remove?.();
    };
  }, [pendingEmail, completeSignIn, authError]);

  return null;
};
