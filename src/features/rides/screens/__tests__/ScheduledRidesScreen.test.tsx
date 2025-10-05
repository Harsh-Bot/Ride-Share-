import React from 'react';
import { render } from '@testing-library/react-native';
import ScheduledRidesScreen from '../ScheduledRidesScreen';
import type { RideTabParams } from '../../../../navigation/types';

const params: RideTabParams = {
  role: 'rider',
  origin: 'SFU Residence',
  destination: {
    id: 'surrey',
    label: 'SFU Surrey'
  }
};

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params }),
  useNavigation: () => ({ navigate: jest.fn() })
}));

describe('ScheduledRidesScreen', () => {
  it('displays rider view with origin and destination from params', () => {
    const { getByText } = render(<ScheduledRidesScreen />);
    expect(getByText('Rider view • SFU Residence → SFU Surrey')).toBeTruthy();
  });
});
