import * as Location from 'expo-location';

import { MapServiceError } from '../../types/maps';

const DEFAULT_CACHE_TTL_MS = 30_000;

let cachedLocation: Location.LocationObject | null = null;
let cachedTimestamp = 0;

export type CachedLocationOptions = {
  force?: boolean;
  cacheTtlMs?: number;
};

const ensurePermissions = async (): Promise<void> => {
  const currentPermissions = await Location.getForegroundPermissionsAsync();

  if (currentPermissions.status === Location.PermissionStatus.GRANTED) {
    return;
  }

  const requestResult = await Location.requestForegroundPermissionsAsync();

  if (requestResult.status !== Location.PermissionStatus.GRANTED) {
    throw new MapServiceError('Location permission not granted by the user', 'permission-denied');
  }
};

const shouldReuseCache = (cacheTtl: number, force?: boolean): boolean => {
  if (force || !cachedLocation) {
    return false;
  }

  return Date.now() - cachedTimestamp < cacheTtl;
};

export const getCachedLocation = async (
  options: CachedLocationOptions = {}
): Promise<Location.LocationObject> => {
  const { force = false, cacheTtlMs = DEFAULT_CACHE_TTL_MS } = options;

  if (shouldReuseCache(cacheTtlMs, force)) {
    return cachedLocation as Location.LocationObject;
  }

  await ensurePermissions();

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });

    cachedLocation = location;
    cachedTimestamp = Date.now();

    return location;
  } catch (error) {
    console.warn('[maps] Failed to resolve geolocation', error);
    throw new MapServiceError('Current position could not be determined', 'location-unavailable', {
      cause: error
    });
  }
};

export const resetLocationCache = () => {
  cachedLocation = null;
  cachedTimestamp = 0;
};

export const __testing = {
  get cachedLocation() {
    return cachedLocation;
  },
  get cachedTimestamp() {
    return cachedTimestamp;
  }
};
