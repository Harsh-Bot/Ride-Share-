import Constants from 'expo-constants';

export type AppEnvironment = 'development' | 'staging' | 'production';

export type GoogleMapsRuntimeConfig = {
  apiKey: string;
  mapId?: string;
  channel?: string;
};

type ExtraConfigShape = {
  environment?: string;
  googleMaps?: {
    apiKey?: string | null;
    mapId?: string | null;
    channel?: string | null;
  };
};

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

const SUPPORTED_ENVIRONMENTS: AppEnvironment[] = ['development', 'staging', 'production'];

const readExtra = (): ExtraConfigShape => {
  const expoExtra = Constants.expoConfig?.extra as ExtraConfigShape | undefined;
  const manifestExtra = (Constants.manifest as { extra?: ExtraConfigShape } | null)?.extra;
  return expoExtra ?? manifestExtra ?? {};
};

export const getAppEnvironment = (): AppEnvironment => {
  const { environment } = readExtra();
  const normalized = (environment ?? 'development').toLowerCase();

  if ((SUPPORTED_ENVIRONMENTS as string[]).includes(normalized)) {
    return normalized as AppEnvironment;
  }

  throw new ConfigurationError(`Unsupported environment "${environment}" provided in Expo extra.`);
};

export const getGoogleMapsConfig = (): GoogleMapsRuntimeConfig => {
  const { googleMaps } = readExtra();

  if (!googleMaps?.apiKey) {
    throw new ConfigurationError('Missing Google Maps API key in Expo extra configuration.');
  }

  return {
    apiKey: googleMaps.apiKey,
    mapId: googleMaps.mapId ?? undefined,
    channel: googleMaps.channel ?? undefined
  };
};
