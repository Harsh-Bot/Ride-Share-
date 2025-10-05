import { resolveCampus } from '../maps';

describe('resolveCampus', () => {
  it('returns campus details for known campus', async () => {
    await expect(resolveCampus('Burnaby')).resolves.toEqual({
      id: 'burnaby',
      label: 'SFU Burnaby',
      latitude: 49.2781,
      longitude: -122.9199
    });
  });

  it('throws TODO error for unknown campus', async () => {
    await expect(resolveCampus('Vancouver')).rejects.toThrow('TODO: integrate Google Maps API for campus resolution');
  });
});
