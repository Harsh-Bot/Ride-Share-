import { jest } from '@jest/globals';

const memoryStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  __esModule: true,
  isAvailableAsync: jest.fn(async () => true),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    memoryStore.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => memoryStore.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key: string) => {
    memoryStore.delete(key);
  })
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(async (key: string, value: string) => {
      memoryStore.set(key, value);
      return null;
    }),
    getItem: jest.fn(async (key: string) => memoryStore.get(key) ?? null),
    removeItem: jest.fn(async (key: string) => {
      memoryStore.delete(key);
      return null;
    })
  }
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  ToastAndroid: {
    SHORT: 0,
    show: jest.fn()
  }
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      ios: { bundleIdentifier: 'ca.sfu.rideshare' },
      android: { package: 'ca.sfu.rideshare' },
      extra: {}
    }
  }
}));
