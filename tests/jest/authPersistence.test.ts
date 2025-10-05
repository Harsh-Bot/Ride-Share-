import { jest } from '@jest/globals';
import {
  clearPendingEmail,
  getPendingEmail,
  savePendingEmail,
  __internal as authStorageInternal
} from '../../src/features/auth/storage';

const getSecureStoreMock = async () =>
  (await import('expo-secure-store')) as unknown as {
    isAvailableAsync: jest.MockedFunction<() => Promise<boolean>>;
    setItemAsync: jest.MockedFunction<(key: string, value: string) => Promise<void>>;
    getItemAsync: jest.MockedFunction<(key: string) => Promise<string | null>>;
    deleteItemAsync: jest.MockedFunction<(key: string) => Promise<void>>;
  };

const getAsyncStorageMock = async () =>
  ((await import('@react-native-async-storage/async-storage')) as unknown as {
    default: {
      setItem: jest.MockedFunction<(key: string, value: string) => Promise<null>>;
      getItem: jest.MockedFunction<(key: string) => Promise<string | null>>;
      removeItem: jest.MockedFunction<(key: string) => Promise<null>>;
    };
  }).default;

describe('auth persistence helper', () => {
  beforeEach(async () => {
    const secureStore = await getSecureStoreMock();
    const asyncStorage = await getAsyncStorageMock();
    secureStore.isAvailableAsync.mockResolvedValue(true);
    secureStore.setItemAsync.mockClear();
    secureStore.getItemAsync.mockClear();
    secureStore.deleteItemAsync.mockClear();
    asyncStorage.setItem.mockClear();
    asyncStorage.getItem.mockClear();
    asyncStorage.removeItem.mockClear();
  });

  it('trims and persists the pending email across storage layers', async () => {
    const secureStore = await getSecureStoreMock();
    const asyncStorage = await getAsyncStorageMock();

    await savePendingEmail(' Student@SFU.ca  ');

    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      authStorageInternal.PENDING_EMAIL_KEY,
      'student@sfu.ca'
    );
    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      authStorageInternal.PENDING_EMAIL_KEY,
      'student@sfu.ca'
    );
  });

  it('returns secure store value with async storage fallback', async () => {
    const secureStore = await getSecureStoreMock();
    const asyncStorage = await getAsyncStorageMock();
    secureStore.getItemAsync.mockResolvedValueOnce('student@sfu.ca');

    const secureResult = await getPendingEmail();
    expect(secureResult).toBe('student@sfu.ca');

    secureStore.getItemAsync.mockResolvedValueOnce(null);
    asyncStorage.getItem.mockResolvedValueOnce('fallback@sfu.ca');

    const fallbackResult = await getPendingEmail();
    expect(fallbackResult).toBe('fallback@sfu.ca');
  });

  it('clears both secure and async stores', async () => {
    const secureStore = await getSecureStoreMock();
    const asyncStorage = await getAsyncStorageMock();

    await clearPendingEmail();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      authStorageInternal.PENDING_EMAIL_KEY
    );
    expect(asyncStorage.removeItem).toHaveBeenCalledWith(
      authStorageInternal.PENDING_EMAIL_KEY
    );
  });
});
