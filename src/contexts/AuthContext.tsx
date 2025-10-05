/** @jsxRuntime automatic */
/** @jsxImportSource react */
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef
} from 'react';
import * as Linking from 'expo-linking';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';

import { getFirebaseAuth } from '../services/firebase';
import { getMagicLinkMetadata, sendMagicLink, verifyLink } from '../services/firebase/auth';
import { clearPendingEmail, getPendingEmail, savePendingEmail } from '../features/auth/storage';
import { showToast } from '../utils/toast';
import { validateEmailAgainstAllowlist } from '../config/emailAllowlist';

type AuthState = {
  isLoading: boolean;
  user: User | null;
  isSendingLink: boolean;
  isCompletingLink: boolean;
  pendingEmail: string | null;
  error: string | null;
};

type AuthAction =
  | { type: 'AUTH_STATE_CHANGED'; user: User | null }
  | { type: 'SEND_LINK_START' }
  | { type: 'SEND_LINK_SUCCESS'; email: string }
  | { type: 'SEND_LINK_FAILURE'; error: string }
  | { type: 'COMPLETE_START' }
  | { type: 'COMPLETE_SUCCESS' }
  | { type: 'COMPLETE_FAILURE'; error: string }
  | { type: 'SET_PENDING_EMAIL'; email: string | null }
  | { type: 'RESET_ERROR' };

const initialState: AuthState = {
  isLoading: true,
  user: null,
  isSendingLink: false,
  isCompletingLink: false,
  pendingEmail: null,
  error: null
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_STATE_CHANGED':
      return {
        ...state,
        isLoading: false,
        user: action.user
      };
    case 'SEND_LINK_START':
      return {
        ...state,
        isSendingLink: true,
        error: null
      };
    case 'SEND_LINK_SUCCESS':
      return {
        ...state,
        isSendingLink: false,
        pendingEmail: action.email
      };
    case 'SEND_LINK_FAILURE':
      return {
        ...state,
        isSendingLink: false,
        error: action.error
      };
    case 'COMPLETE_START':
      return {
        ...state,
        isCompletingLink: true,
        error: null
      };
    case 'COMPLETE_SUCCESS':
      return {
        ...state,
        isCompletingLink: false,
        pendingEmail: null
      };
    case 'COMPLETE_FAILURE':
      return {
        ...state,
        isCompletingLink: false,
        error: action.error
      };
    case 'SET_PENDING_EMAIL':
      return {
        ...state,
        pendingEmail: action.email
      };
    case 'RESET_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  pendingEmail: string | null;
  isSendingLink: boolean;
  isCompletingLink: boolean;
  error: string | null;
  initiateSignIn: (email: string) => Promise<void>;
  completeSignIn: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const stateRef = useRef(state);
  const handledLinkRef = useRef<string | null>(null);

  stateRef.current = state;

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storedEmail = await getPendingEmail();
        if (isMounted && storedEmail) {
          dispatch({ type: 'SET_PENDING_EMAIL', email: storedEmail });
        }
      } catch (error) {
        console.warn('Failed to load pending email', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      dispatch({ type: 'AUTH_STATE_CHANGED', user });
    });
    return unsubscribe;
  }, []);

  const attemptCompleteSignIn = useCallback(async (link: string) => {
    const trimmedLink = link.trim();
    if (!trimmedLink) {
      return;
    }
    if (handledLinkRef.current === trimmedLink) {
      return;
    }

    handledLinkRef.current = trimmedLink;
    dispatch({ type: 'COMPLETE_START' });

    try {
      const cachedEmail = (await getPendingEmail()) ?? stateRef.current.pendingEmail;
      const metadata = getMagicLinkMetadata(trimmedLink);
      const candidateEmail = cachedEmail ?? metadata.email;
      const effectiveEmail =
        typeof candidateEmail === 'string' && candidateEmail.trim().length > 0
          ? candidateEmail
          : undefined;

      await verifyLink(trimmedLink, effectiveEmail);
      await clearPendingEmail();
      dispatch({ type: 'COMPLETE_SUCCESS' });
      showToast('Signed in successfully');
    } catch (error) {
      handledLinkRef.current = null;
      const message = normalizeError(error);
      dispatch({ type: 'COMPLETE_FAILURE', error: message });
      showToast(message, 'error');
      throw error;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handleIncomingLink = async (incomingUrl: string | null | undefined) => {
      if (!incomingUrl) {
        return;
      }
      if (!isMounted) {
        return;
      }

      try {
        await attemptCompleteSignIn(incomingUrl);
      } catch (error) {
        console.error('Failed to complete sign-in from link', error);
      }
    };

    (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        await handleIncomingLink(initialUrl);
      } catch (error) {
        console.error('Error processing initial deep link', error);
      }
    })();

    const subscription = Linking.addEventListener('url', event => {
      void handleIncomingLink(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [attemptCompleteSignIn]);

  const initiateSignIn = useCallback(async (email: string) => {
    const validation = validateEmailAgainstAllowlist(email);
    if (!validation.ok) {
      const message = validation.message;
      dispatch({ type: 'SEND_LINK_FAILURE', error: message });
      throw new Error(message);
    }

    dispatch({ type: 'SEND_LINK_START' });

    try {
      const normalizedEmail = await sendMagicLink(validation.normalizedEmail);
      await savePendingEmail(normalizedEmail);
      dispatch({ type: 'SEND_LINK_SUCCESS', email: normalizedEmail });
      showToast('Magic link sent to your SFU inbox');
    } catch (error) {
      const message = normalizeError(error);
      dispatch({ type: 'SEND_LINK_FAILURE', error: message });
      showToast(message, 'error');
      throw error;
    }
  }, []);

  const completeSignIn = useCallback(async (link: string) => {
    await attemptCompleteSignIn(link);
  }, [attemptCompleteSignIn]);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    await clearPendingEmail();
    dispatch({ type: 'SET_PENDING_EMAIL', email: null });
    showToast('Signed out successfully');
  }, []);

  const resetError = useCallback(() => dispatch({ type: 'RESET_ERROR' }), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(state.user),
      isLoading: state.isLoading,
      user: state.user,
      pendingEmail: state.pendingEmail,
      isSendingLink: state.isSendingLink,
      isCompletingLink: state.isCompletingLink,
      error: state.error,
      initiateSignIn,
      completeSignIn,
      signOut,
      resetError
    }),
    [state, initiateSignIn, completeSignIn, signOut, resetError]
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
