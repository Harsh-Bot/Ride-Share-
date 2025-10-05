import '@testing-library/jest-native/extend-expect';
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('zustand', () => {
  const actual = jest.requireActual('zustand');
  const { act } = jest.requireActual('@testing-library/react-native');
  const storeResetFns = new Set();

  const resettableCreate = (createState) => {
    const store = actual.create((set, get, api) => {
      const initialState = createState(set, get, api);
      storeResetFns.add(() => api.setState(initialState, true));
      return initialState;
    });

    store.resetAll = () => {
      storeResetFns.forEach((resetFn) => {
        act(() => {
          resetFn();
        });
      });
    };

    return store;
  };

  return {
    __esModule: true,
    ...actual,
    create: (createState) => {
      if (typeof createState !== 'function') {
        return actual.create(createState);
      }
      return resettableCreate(createState);
    }
  };
});

// Vector icons are rendered via native fonts; mock them as simple components.
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return ({ name, color, size }: { name: string; color?: string; size?: number }) =>
    React.createElement('Icon', { name, color, size });
});

const mockNavigation = jest.fn(() => ({ navigate: jest.fn() }));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: mockNavigation
  };
});

// Expose mock for test suites that need to tweak navigation behavior.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.__mockedUseNavigation = mockNavigation;
