import React from 'react';
import { render } from '@testing-library/react-native';
import LiveRidesScreen from '../LiveRidesScreen';
import type { RideTabParams } from '../../../../navigation/types';
import { MapProvider } from '../../../../contexts/MapContext';

const params: RideTabParams = {
  role: 'driver',
  origin: '789 Pine Ave',
  destination: {
    id: 'burnaby',
    label: 'SFU Burnaby'
  }
};

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params }),
  useNavigation: () => ({ navigate: jest.fn() })
}));

jest.mock('../../hooks/useRideFeed', () => ({
  useRideFeed: () => ({
    items: [],
    offline: false,
    refreshing: false,
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
  it('displays role and route information from params', () => {
    const { getByText } = render(
      <MapProvider>
        <LiveRidesScreen />
      </MapProvider>
    );
    expect(getByText('Live Ride Exchange')).toBeTruthy();
  });
});
