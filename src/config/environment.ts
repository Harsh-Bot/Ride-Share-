import Constants from 'expo-constants';

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

type ExtraConfigShape = {
  environment?: string;
  googleMaps?: Record<string, unknown>;
  firebase?: {
    apiKey?: string | null;
    authDomain?: string | null;
    projectId?: string | null;
  };
  auth?: {
    provider?: string | null;
    emailLinkUrl?: string | null;
    dynamicLinkDomain?: string | null;
    allowedDomain?: string | null;
  };
  tests?: {
    autoAuth?: boolean;
  };
};

const readExtra = (): ExtraConfigShape => {
  const expoExtra = Constants.expoConfig?.extra as ExtraConfigShape | undefined;
  const manifestExtra = (Constants.manifest as { extra?: ExtraConfigShape } | null)?.extra;
  return expoExtra ?? manifestExtra ?? {};
};

export type AuthRuntimeConfig = {
  provider: 'link';
  emailLinkUrl: string;
  dynamicLinkDomain?: string | null;
  allowedDomain: string;
};

export const getAuthConfig = (): AuthRuntimeConfig => {
  const extra = readExtra().auth ?? {};
  const provider = (extra.provider ?? 'link').toLowerCase();

  if (provider !== 'link') {
    throw new ConfigurationError(`Unsupported auth provider "${provider}"`);
  }

  const emailLinkUrl = (extra.emailLinkUrl ?? process.env.FIREBASE_EMAIL_LINK_URL)?.trim();
  if (!emailLinkUrl) {
    throw new ConfigurationError('Missing Firebase email link URL.');
  }

  const allowedDomain = (extra.allowedDomain ?? 'sfu.ca').replace(/^@/, '').toLowerCase();

  return {
    provider: 'link',
    emailLinkUrl,
    dynamicLinkDomain: extra.dynamicLinkDomain ?? null,
    allowedDomain
  };
};

export type FirebaseRuntimeConfig = {
  apiKey: string | null;
  authDomain: string | null;
  projectId: string | null;
};

export const getFirebaseRuntimeConfig = (): FirebaseRuntimeConfig => {
  const extra = readExtra().firebase ?? {};

  return {
    apiKey: extra.apiKey ?? process.env.FIREBASE_API_KEY ?? null,
    authDomain: extra.authDomain ?? process.env.FIREBASE_AUTH_DOMAIN ?? null,
    projectId: extra.projectId ?? process.env.FIREBASE_PROJECT_ID ?? null
  };
};

export type AuthEmulatorConfig = {
  host: string;
  port: number;
  projectId: string;
};

export const getAuthEmulatorConfig = (): AuthEmulatorConfig | null => {
  if (process.env.FIREBASE_USE_EMULATOR !== 'true') {
    return null;
  }

  const host = process.env.FIREBASE_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number.parseInt(process.env.FIREBASE_EMULATOR_PORT ?? '9099', 10);
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-rideshare';

  return { host, port, projectId };
};
