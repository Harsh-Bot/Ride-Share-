import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import { useProfileStore } from '../../../../store/useProfileStore';
import type { ReactTestInstance } from 'react-test-renderer';

declare const global: typeof globalThis & {
  __mockedUseNavigation: jest.MockedFunction<() => { navigate: jest.Mock }>;
};

type ResettableStore = typeof useProfileStore & {
  resetAll?: () => void;
};

const storeWithReset = useProfileStore as ResettableStore;

const mockedUseNavigation = global.__mockedUseNavigation;

describe('HomeScreen', () => {
  const resetStore = () => {
    if (typeof storeWithReset.resetAll === 'function') {
      storeWithReset.resetAll();
    } else {
      useProfileStore.getState().reset();
    }
  };

  beforeEach(() => {
    resetStore();
    mockedUseNavigation.mockReturnValue({ navigate: jest.fn() });
  });

  afterEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  it('renders greeting with nickname when available', () => {
    useProfileStore.getState().setNickname('Harmeet');
    const { getByText } = render(<HomeScreen />);

    expect(getByText('Hey, Harmeet!')).toBeTruthy();
  });

  it('disables CTAs when origin is empty', () => {
    const { getByLabelText } = render(<HomeScreen />);

    const liveRideButton = getByLabelText('Navigate to LiveRide') as ReactTestInstance;
    const props = liveRideButton.props as { accessibilityState?: { disabled?: boolean }; disabled?: boolean };
    expect(props.disabled ?? props.accessibilityState?.disabled).toBe(true);
  });

  it('navigates to LiveRides with role and locations when selections valid', () => {
    const navigateMock = jest.fn();
    mockedUseNavigation.mockReturnValue({ navigate: navigateMock });
    const { getByLabelText } = render(<HomeScreen />);

    fireEvent.changeText(getByLabelText('Enter origin address'), '123 Main St');
    fireEvent.press(getByLabelText('Role Driver'));
    fireEvent.press(getByLabelText('Navigate to LiveRide'));

    expect(navigateMock).toHaveBeenCalledWith('LiveRides', {
      role: 'driver',
      origin: '123 Main St',
      destination: {
        id: 'surrey',
        label: 'SFU Surrey'
      }
    });
  });
});
