import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import VerifyEmailScreen from '../VerifyEmailScreen';
import { useAuth } from '../../../../hooks/useAuth';

type MockReturn = {
  completeSignIn: jest.Mock;
  authError: string | null;
  isLoading: boolean;
  pendingEmail: string | null;
};

jest.mock('../../../../hooks/useAuth');

const mockCompleteSignIn = jest.fn();
const authMock: MockReturn = {
  completeSignIn: mockCompleteSignIn,
  authError: null,
  isLoading: false,
  pendingEmail: 'student@sfu.ca'
};

(useAuth as jest.Mock).mockImplementation(() => authMock);

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.authError = null;
    authMock.isLoading = false;
    authMock.pendingEmail = 'student@sfu.ca';
  });

  it('matches snapshot', () => {
    const tree = render(
      <VerifyEmailScreen
        navigation={undefined as never}
        route={{ key: 'verify', name: 'VerifyEmail', params: { email: 'student@sfu.ca' } }}
      />
    ).toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('calls completeSignIn when six digit code entered', () => {
    const { getByPlaceholderText, getByText } = render(
      <VerifyEmailScreen
        navigation={undefined as never}
        route={{ key: 'verify', name: 'VerifyEmail', params: { email: 'student@sfu.ca' } }}
      />
    );

    fireEvent.changeText(getByPlaceholderText('000000'), '123456');
    fireEvent.press(getByText('Verify and continue'));

    expect(mockCompleteSignIn).toHaveBeenCalledWith('123456');
  });
});
