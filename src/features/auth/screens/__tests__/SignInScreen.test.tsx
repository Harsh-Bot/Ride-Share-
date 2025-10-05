import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignInScreen from '../SignInScreen';
import { useAuth } from '../../../../hooks/useAuth';
import { useProfileStore } from '../../../../store/useProfileStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { AuthStackParamList } from '../../../../navigation/types';

jest.mock('../../../../hooks/useAuth');

const mockNavigate = jest.fn();
const mockInitiateSignIn = jest.fn();

(useAuth as jest.Mock).mockReturnValue({
  initiateSignIn: mockInitiateSignIn,
  authError: null,
  pendingEmail: '',
  completeSignIn: jest.fn()
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate
  })
}));

type SignInNavigation = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

type ResettableStore = typeof useProfileStore & {
  resetAll?: () => void;
};

const storeWithReset = useProfileStore as ResettableStore;

describe('SignInScreen', () => {
  const resetStore = () => {
    if (typeof storeWithReset.resetAll === 'function') {
      storeWithReset.resetAll();
    } else {
      useProfileStore.getState().reset();
    }
  };

  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  it('validates nickname length', async () => {
    const navigation = { navigate: mockNavigate } as unknown as SignInNavigation;
    const route = { params: undefined } as RouteProp<AuthStackParamList, 'SignIn'>;
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={navigation} route={route} />
    );

    fireEvent.changeText(getByPlaceholderText('Nickname'), 'A');
    fireEvent.press(getByText('Send magic link'));

    expect(getByText('Nickname must be between 2 and 20 characters.')).toBeTruthy();
  });

  it('requires gender selection', () => {
    const navigation = { navigate: mockNavigate } as unknown as SignInNavigation;
    const route = { params: undefined } as RouteProp<AuthStackParamList, 'SignIn'>;
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={navigation} route={route} />
    );

    fireEvent.changeText(getByPlaceholderText('Nickname'), 'Harmeet');
    fireEvent.press(getByText('Send magic link'));

    expect(getByText('Please select a gender or choose rather not say.')).toBeTruthy();
  });

  it('updates store and navigates on valid submission', async () => {
    mockInitiateSignIn.mockResolvedValueOnce(undefined);
    const navigation = { navigate: mockNavigate } as unknown as SignInNavigation;
    const route = { params: undefined } as RouteProp<AuthStackParamList, 'SignIn'>;
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <SignInScreen navigation={navigation} route={route} />
    );

    fireEvent.changeText(getByPlaceholderText('Nickname'), 'Harmeet');
    fireEvent.press(getByLabelText('Gender Male'));
    fireEvent.changeText(getByLabelText('Enter your SFU email'), 'user@sfu.ca');
    fireEvent.press(getByText('Send magic link'));

    await waitFor(() => {
      expect(mockInitiateSignIn).toHaveBeenCalledWith('user@sfu.ca');
    });

    expect(useProfileStore.getState().nickname).toBe('Harmeet');
    expect(useProfileStore.getState().gender).toBe('male');
    expect(mockNavigate).toHaveBeenCalledWith('VerifyEmail', { email: 'user@sfu.ca' });
  });
});
