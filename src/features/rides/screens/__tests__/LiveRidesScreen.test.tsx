import React from 'react';
import { render } from '@testing-library/react-native';
import LiveRidesScreen from '../LiveRidesScreen';

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: undefined }),
  useNavigation: () => ({ navigate: jest.fn() })
}));

jest.mock('../../hooks/useRideFeed', () => ({
  useRideFeed: () => ({
    items: [],
    offline: false,
    refreshing: false,
    lastServerSyncAt: null,
    refresh: jest.fn()
  })
}));

jest.mock('../../hooks/useCreateRidePost', () => ({
  useCreateRidePost: () => ({
    status: 'idle',
    activePost: null,
    error: null,
    pendingCount: 0,
    postRide: jest.fn(),
    retryPending: jest.fn(),
    clearError: jest.fn()
  })
}));

describe('LiveRidesScreen', () => {
  it('renders live ride heading', () => {
    const { getByText } = render(<LiveRidesScreen />);

    expect(getByText('Live Ride Exchange')).toBeTruthy();
  });
});
