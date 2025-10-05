import { test, expect } from '@playwright/test';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where
} from 'firebase/firestore';
import {
  buildRidePostCreateData,
  buildRidePostStatusUpdate
} from '../src/services/firestore/ridePosts';

let testEnv: RulesTestEnvironment;

const RULES_PATH = 'firebase/firestore.rules';
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const [FIRESTORE_HOST, FIRESTORE_PORT_RAW] = FIRESTORE_EMULATOR_HOST.split(':');
const FIRESTORE_PORT = Number(FIRESTORE_PORT_RAW ?? 8080);

const loadFile = (path: string) => readFileSync(path, 'utf8');

test.beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'ride-share-dev',
    firestore: {
      host: FIRESTORE_HOST,
      port: FIRESTORE_PORT,
      rules: loadFile(RULES_PATH)
    }
  });
});

test.afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

test.afterEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test('allows drivers to create ride posts with valid schema', async () => {
  const driverId = 'driver-123';
  const context = testEnv.authenticatedContext(driverId);
  const db = context.firestore();
  const windowStart = Timestamp.fromDate(new Date('2025-10-05T12:00:00Z'));
  const windowEnd = Timestamp.fromDate(new Date('2025-10-05T13:00:00Z'));

  const docRef = doc(db, 'ridePosts', randomUUID());
  await assertSucceeds(
    setDoc(
      docRef,
      buildRidePostCreateData({
        driverId,
        origin: {
          lat: 49.2781,
          lng: -122.9199,
          label: 'Burnaby Campus Parking'
        },
        destinationCampus: 'Surrey',
        seatsTotal: 3,
        windowStart,
        windowEnd
      })
    )
  );

  const snapshot = await assertSucceeds(getDoc(docRef));
  expect(snapshot.exists()).toBeTruthy();

  const data = snapshot.data();
  expect(data?.status).toBe('open');
  expect(data?.createdAt).toBeInstanceOf(Timestamp);
  expect(data?.updatedAt).toBeInstanceOf(Timestamp);
  expect(data?.origin.geohash?.length).toBeGreaterThanOrEqual(3);
});

test('rejects writes missing required fields', async () => {
  const driverId = 'driver-123';
  const context = testEnv.authenticatedContext(driverId);
  const db = context.firestore();

  const docRef = doc(db, 'ridePosts', randomUUID());
  await assertFails(
    setDoc(docRef, {
      driverId,
      origin: {
        lat: 49.2781,
        lng: -122.9199,
        label: 'Burnaby Campus Parking',
        geohash: 'c2b2c0m'
      },
      seatsTotal: 3,
      seatsAvailable: 3,
      windowStart: Timestamp.fromDate(new Date('2025-10-05T12:00:00Z')),
      windowEnd: Timestamp.fromDate(new Date('2025-10-05T13:00:00Z')),
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
  );
});

test('enforces backend-only status transitions with timestamp updates', async () => {
  const driverId = 'driver-abc';
  const postId = randomUUID();
  const driverContext = testEnv.authenticatedContext(driverId);
  const backendContext = testEnv.authenticatedContext('backend-service', {
    backend: true
  });
  const driverDb = driverContext.firestore();
  const backendDb = backendContext.firestore();

  const windowStart = Timestamp.fromDate(new Date('2025-10-05T12:00:00Z'));
  const windowEnd = Timestamp.fromDate(new Date('2025-10-05T13:00:00Z'));

  const driverDocRef = doc(driverDb, 'ridePosts', postId);
  await assertSucceeds(
    setDoc(
      driverDocRef,
      buildRidePostCreateData({
        driverId,
        origin: {
          lat: 49.1877,
          lng: -122.849,
          label: 'Guildford Park and Ride'
        },
        destinationCampus: 'Surrey',
        seatsTotal: 4,
        windowStart,
        windowEnd
      })
    )
  );

  await assertFails(
    setDoc(
      driverDocRef,
      buildRidePostStatusUpdate({
        currentStatus: 'open',
        nextStatus: 'canceled'
      }),
      { merge: true }
    )
  );

  const backendDocRef = doc(backendDb, 'ridePosts', postId);

  await assertFails(
    setDoc(
      backendDocRef,
      buildRidePostCreateData({
        driverId,
        origin: {
          lat: 49.1877,
          lng: -122.849,
          label: 'Guildford Park and Ride'
        },
        destinationCampus: 'Surrey',
        seatsTotal: 4,
        windowStart,
        windowEnd,
        seatsAvailable: 2
      })
    )
  );

  await assertFails(
    setDoc(
      backendDocRef,
      {
        status: 'canceled'
      },
      { merge: true }
    )
  );

  await assertSucceeds(
    setDoc(
      backendDocRef,
      buildRidePostStatusUpdate({
        currentStatus: 'open',
        nextStatus: 'canceled'
      }),
      { merge: true }
    )
  );

  const snapshot = await assertSucceeds(getDoc(backendDocRef));
  const data = snapshot.data();
  expect(data?.status).toBe('canceled');
  expect(data?.updatedAt.toMillis()).toBeGreaterThanOrEqual(data?.createdAt.toMillis());
});

test('supports indexed campus queries ordered by descending windowStart', async () => {
  const driverContext = testEnv.authenticatedContext('driver-456');
  const backendContext = testEnv.authenticatedContext('backend-service', {
    backend: true
  });
  const driverDb = driverContext.firestore();
  const backendDb = backendContext.firestore();

  const baseTime = Timestamp.fromDate(new Date('2025-10-05T10:00:00Z'));

  const posts = [
    { offsetMinutes: 0, seatsTotal: 3 },
    { offsetMinutes: 30, seatsTotal: 2 },
    { offsetMinutes: 60, seatsTotal: 4 }
  ];

  for (const post of posts) {
    const id = randomUUID();
    await assertSucceeds(
      setDoc(
        doc(driverDb, 'ridePosts', id),
        buildRidePostCreateData({
          driverId: 'driver-456',
          origin: {
            lat: 49.2827,
            lng: -123.1187,
            label: 'Downtown Terminal'
          },
          destinationCampus: 'Burnaby',
          seatsTotal: post.seatsTotal,
          windowStart: Timestamp.fromMillis(baseTime.toMillis() + post.offsetMinutes * 60_000),
          windowEnd: Timestamp.fromMillis(baseTime.toMillis() + (post.offsetMinutes + 30) * 60_000)
        })
      )
    );
  }

  const q = query(
    collection(backendDb, 'ridePosts'),
    where('destinationCampus', '==', 'Burnaby'),
    orderBy('windowStart', 'desc')
  );

  const snapshot = await assertSucceeds(getDocs(q));
  const times = snapshot.docs.map((docSnap) => docSnap.data().windowStart.toMillis());
  const sorted = [...times].sort((a, b) => b - a);
  expect(times).toEqual(sorted);
});
