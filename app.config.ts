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

const resolveApiKey = (environment: SupportedEnvironment): string => {
  const directKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const scopedKey = process.env[`GOOGLE_MAPS_API_KEY_${environment.toUpperCase() as 'DEVELOPMENT'}`];
  const trimmedScopedKey = scopedKey?.trim();

  const apiKey = trimmedScopedKey || directKey;

  if (!apiKey) {
    throw new Error(
      `Missing Google Maps API key. Provide GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY_${environment.toUpperCase()} in your environment file.`
    );
  }

  return apiKey;
};

export default (): ExpoConfig => {
  const environment = normalizeEnvironment(process.env.APP_ENV);
  const apiKey = resolveApiKey(environment);

  const expoConfig: ExpoConfig = {
    ...baseConfig.expo,
    extra: {
      ...(baseConfig.expo.extra ?? {}),
      environment,
      googleMaps: {
        apiKey,
        mapId: process.env.GOOGLE_MAPS_MAP_ID?.trim() || null,
        channel: process.env.GOOGLE_MAPS_CHANNEL?.trim() || null
      }
    }
  };

  return expoConfig;
};
