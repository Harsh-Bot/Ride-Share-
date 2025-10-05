import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { isSfuEmail } from '../utils/validation';

type AuthUser = {
  email: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
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

  const initiateSignIn = useCallback<AuthContextValue['initiateSignIn']>(async (email) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isSfuEmail(normalizedEmail)) {
      setAuthError('Please use a valid @sfu.ca email address.');
      throw new Error('Invalid SFU email domain');
    }

    setAuthError(null);
    setPendingEmail(normalizedEmail);
  }, []);

  const completeSignIn = useCallback<AuthContextValue['completeSignIn']>(async (code) => {
    if (!pendingEmail) {
      const errorMessage = 'No pending sign-in request found. Start again.';
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    }

    const sanitizedCode = code.trim();
    if (sanitizedCode.length !== 6 || !/^[0-9]{6}$/.test(sanitizedCode)) {
      const errorMessage = 'Enter the 6-digit code sent to your SFU email.';
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    }

    setIsLoading(true);
    try {
      const authenticatedUser: AuthUser = { email: pendingEmail };
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      setPendingEmail(null);
      setAuthError(null);
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
      user,
      pendingEmail,
      authError,
      initiateSignIn,
      completeSignIn,
      signOut
    }),
    [authError, completeSignIn, initiateSignIn, isAuthenticated, isLoading, pendingEmail, signOut, user]
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
