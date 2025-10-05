/* eslint-disable @typescript-eslint/no-var-requires */
import type { ExpoConfig } from '@expo/config';
import 'dotenv/config';

const baseConfig = require('./app.json') as { expo: ExpoConfig };

const SUPPORTED_ENVIRONMENTS = ['development', 'staging', 'production'] as const;
type SupportedEnvironment = (typeof SUPPORTED_ENVIRONMENTS)[number];

const normalizeEnvironment = (value: string | undefined): SupportedEnvironment => {
  const normalized = (value ?? 'development').toLowerCase();
  if ((SUPPORTED_ENVIRONMENTS as readonly string[]).includes(normalized)) {
    return normalized as SupportedEnvironment;
  }

  console.warn(`Unsupported APP_ENV "${value}" provided. Falling back to development.`);
  return 'development';
};

const buildGoogleMapsExtra = () => ({
  apiKey: process.env.GOOGLE_MAPS_API_KEY?.trim() || null,
  mapId: process.env.GOOGLE_MAPS_MAP_ID?.trim() || null,
  channel: process.env.GOOGLE_MAPS_CHANNEL?.trim() || null
});

const buildFirebaseExtra = () => ({
  apiKey: process.env.FIREBASE_API_KEY?.trim() || null,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN?.trim() || null
});

const buildAuthExtra = () => ({
  provider: (process.env.FIREBASE_AUTH_PROVIDER ?? 'link').toLowerCase(),
  emailLinkUrl: process.env.FIREBASE_EMAIL_LINK_URL?.trim() || null,
  dynamicLinkDomain: process.env.FIREBASE_DYNAMIC_LINK_DOMAIN?.trim() || null,
  allowedDomain: process.env.FIREBASE_AUTH_ALLOWED_DOMAIN?.trim() || 'sfu.ca'
});

const buildTestsExtra = () => ({
  autoAuth: process.env.EXPO_PUBLIC_TEST_AUTO_AUTH === 'true'
});

export default (): ExpoConfig => {
  const environment = normalizeEnvironment(process.env.APP_ENV);

  const expoConfig: ExpoConfig = {
    ...baseConfig.expo,
    extra: {
      ...(baseConfig.expo.extra ?? {}),
      environment,
      googleMaps: buildGoogleMapsExtra(),
      firebase: buildFirebaseExtra(),
      auth: buildAuthExtra(),
      tests: buildTestsExtra()
    }
  };

  return expoConfig;
};
