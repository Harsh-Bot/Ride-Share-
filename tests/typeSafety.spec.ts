import { test, expect } from '@playwright/test';
import { buildInitialPostRideFormState, postRideFormReducer, buildPostRideSubmitPayload } from '../src/features/rides/utils/postRideForm';

test('post ride form reducer produces valid payload without crashing', () => {
  const initial = buildInitialPostRideFormState();
  const after = [
    { type: 'setOriginLabel', payload: 'Cornerstone' },
    { type: 'setDestination', payload: 'Burnaby' },
    { type: 'setSeats', payload: 2 },
    { type: 'setDepartureOffset', payload: 10 },
    { type: 'setWindowDuration', payload: 20 }
  ].reduce(postRideFormReducer as any, initial);

  const payload = buildPostRideSubmitPayload(after);
  expect(payload.origin.label).toBe('Cornerstone');
  expect(payload.destinationCampus).toBe('Burnaby');
  expect(payload.seats).toBe(2);
});

test('ngeohash types are available and encode returns string', async () => {
  const mod = await import('ngeohash');
  const ngeohash: any = (mod as any).default ?? (mod as any);
  const hash = ngeohash.encode(49.28, -123.12);
  expect(typeof hash).toBe('string');
});
