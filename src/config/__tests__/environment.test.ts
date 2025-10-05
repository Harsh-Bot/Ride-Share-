import { ConfigurationError, getAppEnvironment, getGoogleMapsConfig } from '../environment';

type MutableExtra = Record<string, unknown>;

const extra: MutableExtra = {};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra };
    },
    get manifest() {
      return { extra };
    }
  }
}));

describe('environment config helpers', () => {
  beforeEach(() => {
    Object.keys(extra).forEach((key) => delete extra[key]);
  });

  it('returns the configured environment when valid', () => {
    extra.environment = 'staging';

    expect(getAppEnvironment()).toBe('staging');
  });

  it('throws when environment is not supported', () => {
    extra.environment = 'qa';

    expect(() => getAppEnvironment()).toThrow(ConfigurationError);
  });

  it('returns google maps config when present', () => {
    extra.environment = 'production';
    extra.googleMaps = { apiKey: 'maps-key', mapId: 'map-id', channel: 'ride-share' };

    expect(getGoogleMapsConfig()).toEqual({ apiKey: 'maps-key', mapId: 'map-id', channel: 'ride-share' });
  });

  it('throws when google maps key missing', () => {
    extra.environment = 'development';
    extra.googleMaps = {};

    expect(() => getGoogleMapsConfig()).toThrow(ConfigurationError);
  });
});
