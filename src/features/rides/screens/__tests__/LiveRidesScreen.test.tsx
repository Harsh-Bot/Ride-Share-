import React from 'react';
import { render } from '@testing-library/react-native';
import LiveRidesScreen from '../LiveRidesScreen';
import type { RideTabParams } from '../../../../navigation/types';

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

describe('LiveRidesScreen', () => {
  it('displays role and route information from params', () => {
    const { getByText } = render(<LiveRidesScreen />);
    expect(getByText('Driver view • 789 Pine Ave → SFU Burnaby')).toBeTruthy();
  });
});
