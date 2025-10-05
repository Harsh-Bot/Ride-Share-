import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MagicLinkListener } from '../MagicLinkListener';
import { useAuth } from '../../../../hooks/useAuth';

jest.mock('../../../../hooks/useAuth');

const completeSignIn = jest.fn();

// Mock expo-linking to simulate an initial URL and a runtime URL event
jest.mock('expo-linking', () => {
  let handler: ((event: { url: string }) => void) | null = null;
  return {
    __esModule: true,
    getInitialURL: jest.fn(async () => 'https://app.example.com/auth?mode=signIn&oobCode=abc'),
    addEventListener: jest.fn((type: string, cb: (event: { url: string }) => void) => {
      handler = cb;
      return { remove: () => { handler = null; } } as unknown as { remove: () => void };
    }),
    // helper to trigger event in test if ever needed
    __trigger(url: string) {
      handler?.({ url });
    }
  };
});

// Treat any URL as a valid sign-in link in this unit test
jest.mock('../../../../services/firebase/auth', () => ({
  isSignInLink: () => true
}));

(useAuth as jest.Mock).mockReturnValue({
  pendingEmail: 'student@sfu.ca',
  completeSignIn,
  authError: null
});

describe('MagicLinkListener', () => {
  it('attempts to complete sign-in when an initial URL is present', async () => {
    render(<MagicLinkListener />);
    await waitFor(() => expect(completeSignIn).toHaveBeenCalled());
  });
});

