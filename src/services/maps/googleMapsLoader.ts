import { getGoogleMapsConfig } from '../../config/environment';
import { MapServiceError } from '../../types/maps';

const SCRIPT_ID = 'ride-share-google-maps-sdk';

let loaderPromise: Promise<typeof google.maps> | null = null;

const resolveGoogleGlobal = (): typeof google.maps | undefined => {
  return (globalThis as { google?: { maps?: typeof google.maps } }).google?.maps;
};

const buildScriptUrl = (apiKey: string, mapId?: string, channel?: string) => {
  const params = new URLSearchParams({
    key: apiKey,
    v: 'weekly',
    libraries: 'places',
    language: 'en',
    region: 'CA'
  });

  if (mapId) {
    params.set('map_ids', mapId);
  }

  if (channel) {
    params.set('channel', channel);
  }

  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
};

const ensureScriptElement = (src: string): HTMLScriptElement => {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

  if (existing) {
    if (existing.src !== src) {
      existing.remove();
    } else {
      return existing;
    }
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = src;
  script.async = true;
  script.defer = true;
  script.crossOrigin = 'anonymous';

  document.head.appendChild(script);

  return script;
};

const loadScript = (src: string): Promise<typeof google.maps> =>
  new Promise((resolve, reject) => {
    const script = ensureScriptElement(src);

    const handleLoad = () => {
      const googleMaps = resolveGoogleGlobal();
      if (!googleMaps) {
        reject(new MapServiceError('Google Maps global failed integrity check', 'loader-error'));
        return;
      }

      resolve(googleMaps);
    };

    const handleError = (event: Event | string) => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      reject(
        new MapServiceError('Google Maps SDK failed to load', 'loader-error', {
          cause: event instanceof Event ? event : undefined
        })
      );
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (script.readyState === 'complete') {
      handleLoad();
    }
  });

export const loadGoogleMapsSdk = async (): Promise<typeof google.maps> => {
  if (process.env.JEST_WORKER_ID) {
    return {} as typeof google.maps;
  }

  if (typeof document === 'undefined') {
    throw new MapServiceError('Google Maps SDK can only be loaded in a browser context', 'loader-error');
  }

  if (resolveGoogleGlobal()) {
    return resolveGoogleGlobal()!;
  }

  if (!loaderPromise) {
    try {
      const { apiKey, mapId, channel } = getGoogleMapsConfig();
      const scriptSrc = buildScriptUrl(apiKey, mapId, channel);
      loaderPromise = loadScript(scriptSrc).catch((error) => {
        loaderPromise = null;
        throw error;
      });
    } catch (error) {
      loaderPromise = null;
      if (error instanceof MapServiceError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Map configuration missing';
      throw new MapServiceError(message, 'config-missing', { cause: error });
    }
  }

  return loaderPromise;
};

export const resetGoogleMapsLoader = () => {
  loaderPromise = null;
};

export const __testing = {
  resolveGoogleGlobal
};
