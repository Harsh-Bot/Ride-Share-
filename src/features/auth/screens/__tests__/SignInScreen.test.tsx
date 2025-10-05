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

const authMock = {
  initiateSignIn: mockInitiateSignIn,
  authError: null as string | null,
  pendingEmail: '',
  completeSignIn: jest.fn(),
  isSendingLink: false,
  isLoading: false,
  isAuthenticated: false,
  signOut: jest.fn()
};

(useAuth as jest.Mock).mockImplementation(() => authMock);

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
    authMock.authError = null;
    authMock.pendingEmail = '';
    authMock.isSendingLink = false;
  });

  it('validates nickname length', async () => {
    const navigation = { navigate: mockNavigate } as unknown as SignInNavigation;
    const route = { params: undefined } as RouteProp<AuthStackParamList, 'SignIn'>;
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={navigation} route={route} />
    );

    fireEvent.changeText(getByPlaceholderText('Nickname'), 'A');
    fireEvent.press(getByText('Send verification link'));

    expect(getByText('Nickname must be between 2 and 20 characters.')).toBeTruthy();
  });

  it('requires gender selection', () => {
    const navigation = { navigate: mockNavigate } as unknown as SignInNavigation;
    const route = { params: undefined } as RouteProp<AuthStackParamList, 'SignIn'>;
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={navigation} route={route} />
    );

    fireEvent.changeText(getByPlaceholderText('Nickname'), 'Harmeet');
    fireEvent.press(getByText('Send verification link'));

    expect(getByText('Please select a gender or choose rather not say.')).toBeTruthy();
  });

  it('shows an error when initiateSignIn rejects', async () => {
    mockInitiateSignIn.mockRejectedValueOnce(new Error('Please use your sfu.ca email'));
    const navigation = { navigate: mockNavigate } as unknown as SignInNavigation;
    const route = { params: undefined } as RouteProp<AuthStackParamList, 'SignIn'>;
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <SignInScreen navigation={navigation} route={route} />
    );

    fireEvent.changeText(getByPlaceholderText('Nickname'), 'Harmeet');
    fireEvent.press(getByLabelText('Gender Male'));
    fireEvent.changeText(getByLabelText('Enter your SFU email'), 'user@gmail.com');
    fireEvent.press(getByText('Send verification link'));

    await waitFor(() => {
      expect(getByText('Please use your sfu.ca email')).toBeTruthy();
    });
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
    fireEvent.press(getByText('Send verification link'));

    await waitFor(() => {
      expect(mockInitiateSignIn).toHaveBeenCalledWith('user@sfu.ca');
    });

    expect(useProfileStore.getState().nickname).toBe('Harmeet');
    expect(useProfileStore.getState().gender).toBe('male');
    expect(mockNavigate).toHaveBeenCalledWith('VerifyEmail', { email: 'user@sfu.ca' });
    await waitFor(() => {
      expect(getByText('Verification link sent to user@sfu.ca.')).toBeTruthy();
    });
  });

  it('disables the send button while link is sending', () => {
    authMock.isSendingLink = true;
    const navigation = { navigate: mockNavigate } as unknown as SignInNavigation;
    const route = { params: undefined } as RouteProp<AuthStackParamList, 'SignIn'>;
    const { getByLabelText } = render(<SignInScreen navigation={navigation} route={route} />);

    const button = getByLabelText('Send sign-in code') as unknown as {
      props: { disabled?: boolean; accessibilityState?: { disabled?: boolean } };
    };
    expect(button.props.disabled ?? button.props.accessibilityState?.disabled).toBe(true);
  });
});
