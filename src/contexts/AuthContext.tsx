import { createContext, ReactNode, useContext, useState } from 'react';

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: null;
  initiateSignIn: (email: string) => Promise<void>;
  completeSignIn: (link: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated] = useState(false);
  const [isLoading] = useState(false);

  const initiateSignIn = async (_email: string) => {
    // TODO: Implement Firebase email link/OTP initiation
  };

  const completeSignIn = async (_link: string) => {
    // TODO: Implement sign-in completion using dynamic links
  };

  const signOut = async () => {
    // TODO: Implement sign-out flow and token revocation
  };

  const value: AuthContextValue = {
    isAuthenticated,
    isLoading,
    user: null,
    initiateSignIn,
    completeSignIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
