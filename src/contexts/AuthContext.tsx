import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import {
  sendSignInLink,
  completeSignIn as completeEmailLinkSignIn,
  InvalidCampusEmailError
} from '../services/firebase/auth';
import { ConfigurationError } from '../config/environment';

type AuthUser = {
  email: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  isSendingLink: boolean;
  user: AuthUser | null;
  pendingEmail: string | null;
  authError: string | null;
  initiateSignIn: (email: string) => Promise<void>;
  completeSignIn: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);

  const initiateSignIn = useCallback<AuthContextValue['initiateSignIn']>(async (email) => {
    const normalizedEmail = email.trim().toLowerCase();

    setAuthError(null);
    setIsSendingLink(true);
    try {
      await sendSignInLink(normalizedEmail);
      setPendingEmail(normalizedEmail);
    } catch (error) {
      if (error instanceof InvalidCampusEmailError || error instanceof ConfigurationError) {
        setAuthError(error.message);
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unable to send verification link.';
      setAuthError(message);
      throw new Error(message);
    } finally {
      setIsSendingLink(false);
    }
  }, []);

  const completeSignIn = useCallback<AuthContextValue['completeSignIn']>(async (code) => {
    if (!pendingEmail) {
      const errorMessage = 'No pending sign-in request found. Start again.';
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    }

    setIsLoading(true);
    try {
      const credential = await completeEmailLinkSignIn(pendingEmail, code);
      const authenticatedUser: AuthUser = {
        email: credential.user?.email ?? pendingEmail
      };
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      setPendingEmail(null);
      setAuthError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed.';
      setAuthError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [pendingEmail]);

  const signOut = useCallback<AuthContextValue['signOut']>(async () => {
    setIsAuthenticated(false);
    setUser(null);
    setPendingEmail(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isLoading,
      isSendingLink,
      user,
      pendingEmail,
      authError,
      initiateSignIn,
      completeSignIn,
      signOut
    }),
    [
      authError,
      completeSignIn,
      initiateSignIn,
      isAuthenticated,
      isLoading,
      isSendingLink,
      pendingEmail,
      signOut,
      user
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
