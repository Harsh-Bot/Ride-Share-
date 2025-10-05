import { test, expect } from '@playwright/test';
import { FirebaseError } from 'firebase/app';
import { RidePostController } from '../src/features/rides/hooks/useCreateRidePost';
import type { PostRideSubmitPayload } from '../src/features/rides/types/postRide';
import type {
  CreateRidePostFn,
  RidePostClientSnapshot,
  SubscribeToRidePostFn
} from '../src/features/rides/api/ridePosts';

const samplePayload: PostRideSubmitPayload = {
  origin: {
    label: 'Cornerstone Bus Loop',
    latitude: 49.279,
    longitude: -122.921,
    precision: 'exact'
  },
  destinationCampus: 'Burnaby',
  seats: 3,
  departureOffsetMinutes: 5,
  windowDurationMinutes: 15
};

test('successful ride post transitions to live status after subscription update', async () => {
  const createdSnapshot: RidePostClientSnapshot = {
    postId: 'post-123',
    status: 'open',
    seatsAvailable: 3,
    seatsTotal: 3,
    destinationCampus: 'Burnaby',
    windowStart: new Date(),
    windowEnd: new Date(Date.now() + 600_000),
    originLabel: 'Cornerstone Bus Loop',
    originPrecision: 'exact'
  };

  let subscriber: ((snapshot: RidePostClientSnapshot) => void) | null = null;

  const createRidePostFn: CreateRidePostFn = async () => ({
    postId: createdSnapshot.postId,
    snapshot: createdSnapshot
  });

  const subscribeToRidePostFn: SubscribeToRidePostFn = ({ onSnapshot }) => {
    subscriber = onSnapshot;
    return () => {
      subscriber = null;
    };
  };

  const controller = new RidePostController({
    driverId: 'driver-test',
    createRidePostFn,
    subscribeToRidePostFn
  });

  await controller.postRide(samplePayload);

  expect(controller.getState().status).toBe('posting');
  expect(controller.getState().activePost?.postId).toBe(createdSnapshot.postId);

  subscriber?.({
    ...createdSnapshot,
    seatsAvailable: 2
  });

  expect(controller.getState().status).toBe('live');
  expect(controller.getState().activePost?.seatsAvailable).toBe(2);

  controller.dispose();
});

test('seat updates from subscription propagate to active state', async () => {
  const createdSnapshot: RidePostClientSnapshot = {
    postId: 'post-abc',
    status: 'open',
    seatsAvailable: 4,
    seatsTotal: 4,
    destinationCampus: 'Surrey',
    windowStart: new Date(),
    windowEnd: new Date(Date.now() + 300_000),
    originLabel: 'Guildford Exchange',
    originPrecision: 'approximate'
  };

  let subscriber: ((snapshot: RidePostClientSnapshot) => void) | null = null;

  const controller = new RidePostController({
    driverId: 'driver-two',
    createRidePostFn: async () => ({ postId: createdSnapshot.postId, snapshot: createdSnapshot }),
    subscribeToRidePostFn: ({ onSnapshot }) => {
      subscriber = onSnapshot;
      return () => {
        subscriber = null;
      };
    }
  });

  await controller.postRide(samplePayload);

  subscriber?.({ ...createdSnapshot, seatsAvailable: 1, status: 'inTrip' });

  expect(controller.getState().activePost?.seatsAvailable).toBe(1);
  expect(controller.getState().activePost?.status).toBe('inTrip');

  controller.dispose();
});

test('failure clears active post state and reports error', async () => {
  const controller = new RidePostController({
    driverId: 'driver-fail',
    createRidePostFn: async () => {
      throw new FirebaseError('permission-denied', 'Permission denied');
    },
    subscribeToRidePostFn: () => () => {}
  });

  await controller.postRide(samplePayload);

  const state = controller.getState();
  expect(state.status).toBe('error');
  expect(state.activePost).toBeNull();
  expect(state.error).toMatch(/permission/i);

  controller.dispose();
});

test('offline failure queues post and retry succeeds', async () => {
  let shouldFail = true;
  let subscriber: ((snapshot: RidePostClientSnapshot) => void) | null = null;

  const controller = new RidePostController({
    driverId: 'driver-offline',
    createRidePostFn: async () => {
      if (shouldFail) {
        throw new FirebaseError('unavailable', 'Network unavailable');
      }
      return {
        postId: 'post-offline',
        snapshot: {
          postId: 'post-offline',
          status: 'open',
          seatsAvailable: 2,
          seatsTotal: 2,
          destinationCampus: 'Burnaby',
          windowStart: new Date(),
          windowEnd: new Date(Date.now() + 600_000),
          originLabel: 'Lot B',
          originPrecision: 'approximate'
        }
      };
    },
    subscribeToRidePostFn: ({ onSnapshot }) => {
      subscriber = onSnapshot;
      return () => {
        subscriber = null;
      };
    }
  });

  await controller.postRide(samplePayload);

  expect(controller.getState().status).toBe('queued');
  expect(controller.getState().pendingCount).toBe(1);

  shouldFail = false;
  await controller.retryPending();

  subscriber?.({
    postId: 'post-offline',
    status: 'open',
    seatsAvailable: 2,
    seatsTotal: 2,
    destinationCampus: 'Burnaby',
    windowStart: new Date(),
    windowEnd: new Date(Date.now() + 600_000),
    originLabel: 'Lot B',
    originPrecision: 'approximate'
  });

  expect(controller.getState().status).toBe('live');
  expect(controller.getState().pendingCount).toBe(0);
  expect(controller.getState().activePost?.postId).toBe('post-offline');

  controller.dispose();
});
