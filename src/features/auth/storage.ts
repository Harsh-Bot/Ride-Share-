import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_EMAIL_KEY = 'auth.pendingEmail';

const canUseSecureStore = async () => {
  try {
    return (await SecureStore.isAvailableAsync()) === true;
  } catch (error) {
    console.warn('SecureStore availability check failed', error);
    return false;
  }
};

export const savePendingEmail = async (email: string) => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    await clearPendingEmail();
    return;
  }

  const secureStoreAvailable = await canUseSecureStore();

  if (secureStoreAvailable) {
    await SecureStore.setItemAsync(PENDING_EMAIL_KEY, normalized);
  }

  await AsyncStorage.setItem(PENDING_EMAIL_KEY, normalized);
};

export const getPendingEmail = async (): Promise<string | null> => {
  const secureStoreAvailable = await canUseSecureStore();
  if (secureStoreAvailable) {
    const fromSecureStore = await SecureStore.getItemAsync(PENDING_EMAIL_KEY);
    if (fromSecureStore) {
      return fromSecureStore;
    }
  }

  return AsyncStorage.getItem(PENDING_EMAIL_KEY);
};

export const clearPendingEmail = async () => {
  const secureStoreAvailable = await canUseSecureStore();
  if (secureStoreAvailable) {
    await SecureStore.deleteItemAsync(PENDING_EMAIL_KEY);
  }

  await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
};

export const __internal = {
  PENDING_EMAIL_KEY
};
