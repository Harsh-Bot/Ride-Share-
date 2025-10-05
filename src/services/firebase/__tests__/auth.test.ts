import { sendSignInLink, isSignInLink, completeSignIn, InvalidCampusEmailError } from '../auth';
import { getFirebaseAuth } from '../index';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { getAuthConfig, ConfigurationError } from '../../../config/environment';

jest.mock('../index', () => ({
  getFirebaseAuth: jest.fn()
}));

jest.mock('firebase/auth', () => ({
  sendSignInLinkToEmail: jest.fn(),
  isSignInWithEmailLink: jest.fn(),
  signInWithEmailLink: jest.fn()
}));

jest.mock('../../../config/environment', () => ({
  getAuthConfig: jest.fn(),
  ConfigurationError: class ConfigurationError extends Error {}
}));

const getFirebaseAuthMock = getFirebaseAuth as jest.Mock;
const sendSignInLinkToEmailMock = sendSignInLinkToEmail as jest.Mock;
const isSignInWithEmailLinkMock = isSignInWithEmailLink as jest.Mock;
const signInWithEmailLinkMock = signInWithEmailLink as jest.Mock;
const getAuthConfigMock = getAuthConfig as jest.Mock;

const defaultAuthConfig = {
  provider: 'link' as const,
  emailLinkUrl: 'https://rideshare.dev/auth',
  dynamicLinkDomain: 'rideshare.page.link',
  allowedDomain: 'sfu.ca'
};

beforeEach(() => {
  jest.clearAllMocks();
  getFirebaseAuthMock.mockReturnValue({});
  sendSignInLinkToEmailMock.mockResolvedValue(undefined);
  isSignInWithEmailLinkMock.mockReturnValue(true);
  signInWithEmailLinkMock.mockResolvedValue({ user: { uid: 'example' } });
  getAuthConfigMock.mockReturnValue(defaultAuthConfig);
});

describe('sendSignInLink', () => {
  it('sends a sign-in link for valid SFU addresses', async () => {
    await expect(sendSignInLink('student@sfu.ca')).resolves.not.toThrow();

    expect(sendSignInLinkToEmailMock).toHaveBeenCalledWith(
      getFirebaseAuthMock.mock.results[0].value,
      'student@sfu.ca',
      expect.objectContaining({
        url: defaultAuthConfig.emailLinkUrl,
        handleCodeInApp: true
      })
    );
  });

  it('rejects non-campus email addresses', async () => {
    await expect(sendSignInLink('user@gmail.com')).rejects.toBeInstanceOf(
      InvalidCampusEmailError
    );

    expect(sendSignInLinkToEmailMock).not.toHaveBeenCalled();
  });

  it('surfaces configuration errors when auth is not set up', async () => {
    getAuthConfigMock.mockImplementationOnce(() => {
      throw new ConfigurationError('Missing Firebase email link URL.');
    });

    await expect(sendSignInLink('student@sfu.ca')).rejects.toThrow(
      ConfigurationError
    );
  });
});

describe('isSignInLink', () => {
  it('delegates to firebase auth helper', () => {
    const result = isSignInLink('https://example.com');
    expect(result).toBe(true);
    expect(isSignInWithEmailLinkMock).toHaveBeenCalledWith(
      getFirebaseAuthMock.mock.results[0].value,
      'https://example.com'
    );
  });
});

describe('completeSignIn', () => {
  it('completes sign-in using Firebase email link', async () => {
    const credential = await completeSignIn('student@sfu.ca', 'https://example.com');

    expect(signInWithEmailLinkMock).toHaveBeenCalledWith(
      getFirebaseAuthMock.mock.results[0].value,
      'student@sfu.ca',
      'https://example.com'
    );
    expect(credential).toEqual({ user: { uid: 'example' } });
  });
});
