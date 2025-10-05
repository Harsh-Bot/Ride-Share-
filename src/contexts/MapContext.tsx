import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import type * as Location from 'expo-location';

import { loadGoogleMapsSdk } from '../services/maps/googleMapsLoader';
import { getCachedLocation } from '../services/maps/location';
import { MapServiceError } from '../types/maps';

type GoogleMapsApi = Awaited<ReturnType<typeof loadGoogleMapsSdk>>;

export type MapStatus = 'idle' | 'loading' | 'ready' | 'error';

export type MapContextValue = {
  status: MapStatus;
  isReady: boolean;
  googleMaps: GoogleMapsApi | null;
  location: Location.LocationObject | null;
  error: MapServiceError | null;
  refreshLocation: (options?: { force?: boolean; suppressError?: boolean }) => Promise<Location.LocationObject | null>;
};

const MapContext = createContext<MapContextValue | undefined>(undefined);

const toMapServiceError = (error: unknown, fallbackMessage: string): MapServiceError => {
  if (error instanceof MapServiceError) {
    return error;
  }

  return new MapServiceError(fallbackMessage, 'loader-error', { cause: error });
};

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<MapStatus>('idle');
  const [googleMaps, setGoogleMaps] = useState<GoogleMapsApi | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<MapServiceError | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshLocation = useCallback(
    async (options: { force?: boolean; suppressError?: boolean } = {}) => {
      const { force = false, suppressError = false } = options;

      try {
        const nextLocation = await getCachedLocation({ force });

        if (mountedRef.current) {
          setLocation(nextLocation);
          if (!suppressError) {
            setError(null);
          }
        }

        return nextLocation;
      } catch (err) {
        const mapError = err instanceof MapServiceError
          ? err
          : new MapServiceError('Unable to refresh device location', 'location-unavailable', { cause: err });

        if (mountedRef.current && !suppressError) {
          setError(mapError);
        }

        if (suppressError) {
          return null;
        }

        throw mapError;
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (process.env.JEST_WORKER_ID) {
        setStatus('ready');
        setGoogleMaps({} as GoogleMapsApi);
        return;
      }

      if (Platform.OS !== 'web') {
        setStatus('ready');
        setGoogleMaps(null);
        setError(null);

        await refreshLocation({ suppressError: true });
        return;
      }

      setStatus('loading');

      try {
        const maps = await loadGoogleMapsSdk();

        if (cancelled || !mountedRef.current) {
          return;
        }

        setGoogleMaps(maps);
        setStatus('ready');

        await refreshLocation({ suppressError: true });
      } catch (err) {
        if (cancelled || !mountedRef.current) {
          return;
        }

        const mapError = toMapServiceError(err, 'Failed to initialise Google Maps SDK');
        console.error('[maps] bootstrap failure', mapError);
        setError(mapError);
        setStatus('error');
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refreshLocation]);

  const value = useMemo<MapContextValue>(
    () => ({
      status,
      isReady: status === 'ready',
      googleMaps,
      location,
      error,
      refreshLocation
    }),
    [status, googleMaps, location, error, refreshLocation]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMapContext = (): MapContextValue => {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }

  return context;
};
