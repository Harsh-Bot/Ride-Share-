import { getCachedLocation, resetLocationCache } from '../location';
import { MapServiceError } from '../../../types/maps';

const mockGetForegroundPermissionsAsync = jest.fn();
const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();

jest.mock('expo-location', () => ({
  __esModule: true,
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied'
  },
  Accuracy: {
    Balanced: 3
  },
  getForegroundPermissionsAsync: (...args: unknown[]) => mockGetForegroundPermissionsAsync(...args),
  requestForegroundPermissionsAsync: (...args: unknown[]) => mockRequestForegroundPermissionsAsync(...args),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrentPositionAsync(...args)
}));

describe('location service', () => {
  beforeEach(() => {
    resetLocationCache();
    mockGetForegroundPermissionsAsync.mockReset();
    mockRequestForegroundPermissionsAsync.mockReset();
    mockGetCurrentPositionAsync.mockReset();
  });

  it('caches location results within TTL', async () => {
    const location = {
      coords: { latitude: 49.2827, longitude: -123.1207, accuracy: 5 },
      timestamp: Date.now()
    } as const;

    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue(location);

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);

    await expect(getCachedLocation()).resolves.toEqual(location);

    nowSpy.mockReturnValue(2_000);

    await expect(getCachedLocation()).resolves.toEqual(location);

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);

    nowSpy.mockRestore();
  });

  it('throws permission denied error when user rejects permissions', async () => {
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    await expect(getCachedLocation()).rejects.toEqual(
      expect.objectContaining({
        code: 'permission-denied'
      })
    );
  });

  it('wraps unexpected location errors', async () => {
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockRejectedValue(new Error('gps failure'));

    await expect(getCachedLocation({ force: true })).rejects.toBeInstanceOf(MapServiceError);
    await expect(getCachedLocation({ force: true })).rejects.toEqual(
      expect.objectContaining({ code: 'location-unavailable' })
    );
  });
});
