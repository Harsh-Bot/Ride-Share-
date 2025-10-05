/** @jest-environment jsdom */
import { loadGoogleMapsSdk, resetGoogleMapsLoader } from '../googleMapsLoader';
import { MapServiceError } from '../../../types/maps';

const mockGetGoogleMapsConfig = jest.fn();
const MockConfigurationError = class extends Error {};
const originalJestWorkerId = process.env.JEST_WORKER_ID;

jest.mock('../../../config/environment', () => ({
  __esModule: true,
  getGoogleMapsConfig: (...args: unknown[]) => mockGetGoogleMapsConfig(...args),
  ConfigurationError: MockConfigurationError
}));

describe('googleMapsLoader', () => {
  beforeEach(() => {
    delete process.env.JEST_WORKER_ID;
    resetGoogleMapsLoader();
    mockGetGoogleMapsConfig.mockReset();
    if (!document.head) {
      const head = document.createElement('head');
      document.documentElement.appendChild(head);
    }
    document.getElementById('ride-share-google-maps-sdk')?.remove();
    delete (globalThis as { google?: { maps?: unknown } }).google;
  });

  afterAll(() => {
    if (originalJestWorkerId) {
      process.env.JEST_WORKER_ID = originalJestWorkerId;
    } else {
      delete process.env.JEST_WORKER_ID;
    }
  });

  it('loads google maps only once and caches the promise', async () => {
    mockGetGoogleMapsConfig.mockReturnValue({ apiKey: 'key', mapId: undefined, channel: undefined });

    const firstPromise = loadGoogleMapsSdk();
    const script = document.getElementById('ride-share-google-maps-sdk') as HTMLScriptElement;
    expect(script).toBeTruthy();

    (globalThis as { google?: { maps?: unknown } }).google = { maps: {} };
    script.dispatchEvent(new Event('load'));

    await expect(firstPromise).resolves.toBeDefined();

    const secondPromise = loadGoogleMapsSdk();
    await expect(secondPromise).resolves.toBeDefined();

    expect(mockGetGoogleMapsConfig).toHaveBeenCalledTimes(1);
  });

  it('throws a MapServiceError when loader fails integrity check', async () => {
    mockGetGoogleMapsConfig.mockReturnValue({ apiKey: 'key', mapId: undefined, channel: undefined });

    const promise = loadGoogleMapsSdk();
    const script = document.getElementById('ride-share-google-maps-sdk') as HTMLScriptElement;
    expect(script).toBeTruthy();

    script.dispatchEvent(new Event('load'));

    await expect(promise).rejects.toEqual(
      expect.objectContaining({
        name: 'MapServiceError',
        code: 'loader-error'
      })
    );
  });

  it('translates configuration errors into MapServiceError config-missing', async () => {
    mockGetGoogleMapsConfig.mockImplementation(() => {
      throw new MockConfigurationError('missing key');
    });

    await expect(loadGoogleMapsSdk()).rejects.toEqual(
      expect.objectContaining({
        code: 'config-missing'
      })
    );
  });
});
