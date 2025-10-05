import { test, expect } from '@playwright/test';
import { FirebaseError } from 'firebase/app';
import { RideFeedController, RideFeedItem } from '../src/features/rides/hooks/useRideFeed';
import { RiderActionsController } from '../src/features/rides/hooks/useRiderActions';

test('cached rides show offline with stale badge', async () => {
  const items: RideFeedItem[] = [
    { id: 'p1', destinationCampus: 'Burnaby', seatsAvailable: 2, status: 'open' }
  ];
  let onSnap: ((items: RideFeedItem[], fromServer: boolean) => void) | null = null;
  const controller = new RideFeedController({
    subscribe: ({ onSnapshot }) => { onSnap = onSnapshot; return () => { onSnap = null; }; },
    refreshFn: async () => { throw new FirebaseError('unavailable', 'offline'); },
    now: () => 1000
  });

  // initial server snapshot
  controller.subscribe(() => {});
  onSnap?.(items, true);
  expect(controller.getState().items[0].isStale).toBe(false);

  // time passes >5min and refresh fails (offline)
  (controller as any).now = () => 1000 + 6 * 60_000;
  await controller.refresh();
  expect(controller.getState().offline).toBe(true);
  expect(controller.getState().items[0].isStale).toBe(true);
});

test('actions queue successfully while offline', async () => {
  const actions = new RiderActionsController({
    requestRide: async () => { throw new FirebaseError('unavailable', 'offline'); },
    cancelRequest: async () => { throw new FirebaseError('unavailable', 'offline'); },
    cancelBooking: async () => { throw new FirebaseError('unavailable', 'offline'); }
  });

  await actions.requestRide({ postId: 'x', riderId: 'r1', destinationCampus: 'Burnaby', pickup: { lat: 0, lng: 0, label: 'P', isApprox: false } });
  expect(actions.getState().status).toBe('queued');
  expect(actions.getState().pendingCount).toBe(1);

  await actions.cancelRequest('req-1' as any);
  expect(actions.getState().pendingCount).toBe(2);
});

test('reconnection syncs statuses correctly', async () => {
  let succeed = false;
  const actions = new RiderActionsController({
    requestRide: async () => { if (!succeed) throw new FirebaseError('unavailable', 'offline'); },
    cancelRequest: async () => { if (!succeed) throw new FirebaseError('unavailable', 'offline'); },
    cancelBooking: async () => { if (!succeed) throw new FirebaseError('unavailable', 'offline'); }
  });
  await actions.requestRide({ postId: 'x', riderId: 'r1', destinationCampus: 'Burnaby', pickup: { lat: 0, lng: 0, label: 'P', isApprox: false } });
  await actions.cancelBooking('b1' as any);
  expect(actions.getState().pendingCount).toBe(2);
  succeed = true;
  await actions.retryPending();
  await actions.retryPending();
  expect(actions.getState().pendingCount).toBe(0);
  expect(actions.getState().status).toBe('idle');
});

test('stale posts disappear on refresh if canceled', async () => {
  let current: RideFeedItem[] = [
    { id: 'p1', destinationCampus: 'Burnaby', seatsAvailable: 1, status: 'open' },
    { id: 'p2', destinationCampus: 'Surrey', seatsAvailable: 2, status: 'open' }
  ];
  let onSnap: ((items: RideFeedItem[], fromServer: boolean) => void) | null = null;
  const controller = new RideFeedController({
    subscribe: ({ onSnapshot }) => { onSnap = onSnapshot; return () => { onSnap = null; }; },
    refreshFn: async () => {
      // simulate p2 canceled on server
      current = current.filter((p) => p.id !== 'p2');
      return current;
    },
    now: () => Date.now()
  });
  controller.subscribe(() => {});
  // initial server snapshot with both posts
  onSnap?.(current, true);
  expect(controller.getState().items.length).toBe(2);
  // offline cached remains until refresh
  onSnap?.(current, false);
  await controller.refresh();
  expect(controller.getState().items.length).toBe(1);
  expect(controller.getState().items[0].id).toBe('p1');
});

