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
  where,
  serverTimestamp
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  buildRidePostCreateData,
  buildRidePostStatusUpdate
} from '../src/services/firestore/ridePosts';

let testEnv: RulesTestEnvironment;
let shouldSkip = false;

const RULES_PATH = 'firebase/firestore.rules';
const DEFAULT_FIRESTORE_HOST = '127.0.0.1';
const DEFAULT_FIRESTORE_PORT = 8080;
const emulatorHostSetting = process.env.FIRESTORE_EMULATOR_HOST ?? '';

const parseEmulatorHost = (raw: string) => {
  let host = DEFAULT_FIRESTORE_HOST;
  let port = DEFAULT_FIRESTORE_PORT;
  if (raw.includes(':')) {
    const [maybeHost, maybePort] = raw.split(':', 2);
    host = maybeHost || DEFAULT_FIRESTORE_HOST;
    const parsedPort = Number(maybePort);
    if (Number.isFinite(parsedPort) && parsedPort > 0) {
      port = parsedPort;
    }
  } else if (raw.trim()) {
    host = raw.trim();
  }
  return { host, port };
};

const { host: FIRESTORE_HOST, port: FIRESTORE_PORT } = parseEmulatorHost(emulatorHostSetting);

const loadFile = (path: string) => readFileSync(path, 'utf8');

const sampleWindowStart = () => Timestamp.fromDate(new Date('2025-10-05T12:00:00Z'));
const sampleWindowEnd = () => Timestamp.fromDate(new Date('2025-10-05T13:00:00Z'));

const skipIfUnavailable = () => {
  if (shouldSkip) {
    test.skip(true, 'Firestore emulator not available');
  }
};

const createRidePost = async (
  db: Firestore,
  driverId: string,
  overrides: Partial<Omit<Parameters<typeof buildRidePostCreateData>[0], 'driverId'>> = {}
) => {
  const docRef = doc(db, 'ridePosts', randomUUID());
  await assertSucceeds(
    setDoc(
      docRef,
      buildRidePostCreateData({
        driverId,
        origin: {
          lat: 49.2781,
          lng: -122.9199,
          label: 'Burnaby Campus Parking',
          precision: 'exact'
        },
        destinationCampus: 'Surrey',
        seatsTotal: 3,
        windowStart: sampleWindowStart(),
        windowEnd: sampleWindowEnd(),
        ...overrides
      })
    )
  );
  return docRef;
};

test.beforeAll(async () => {
  try {
    testEnv = await initializeTestEnvironment({
      projectId: 'ride-share-dev',
      firestore: {
        host: FIRESTORE_HOST,
        port: FIRESTORE_PORT,
        rules: loadFile(RULES_PATH)
      }
    });
    const probeContext = testEnv.authenticatedContext('probe-driver');
    const probeDb = probeContext.firestore();
    const probeRef = doc(probeDb, 'ridePosts', 'probe');
    await setDoc(
      probeRef,
      buildRidePostCreateData({
        driverId: 'probe-driver',
        origin: {
          lat: 49.2781,
          lng: -122.9199,
          label: 'Probe Location',
          precision: 'exact'
        },
        destinationCampus: 'Burnaby',
        seatsTotal: 1,
        windowStart: sampleWindowStart(),
        windowEnd: sampleWindowEnd()
      })
    );
    await testEnv.clearFirestore();
  } catch (error) {
    console.warn(
      `Skipping Firestore rule tests. Firestore emulator unavailable or misconfigured at ${FIRESTORE_HOST}:${FIRESTORE_PORT}. Reason:`,
      error instanceof Error ? error.message : error
    );
    shouldSkip = true;
  }
});

test.afterAll(async () => {
  if (testEnv && !shouldSkip) {
    await testEnv.cleanup();
  }
});

test.afterEach(async () => {
  if (testEnv && !shouldSkip) {
    await testEnv.clearFirestore();
  }
});

test('allows drivers to create ride posts with valid schema', async () => {
  skipIfUnavailable();
  const driverId = 'driver-123';
  const context = testEnv.authenticatedContext(driverId);
  const db = context.firestore();

  const docRef = await createRidePost(db, driverId);
  const snapshot = await assertSucceeds(getDoc(docRef));
  expect(snapshot.exists()).toBeTruthy();

  const data = snapshot.data();
  expect(data?.status).toBe('open');
  expect(data?.createdAt).toBeInstanceOf(Timestamp);
  expect(data?.updatedAt).toBeInstanceOf(Timestamp);
  expect(data?.origin.geohash?.length).toBeGreaterThanOrEqual(3);
});

test('rejects writes missing required fields', async () => {
  skipIfUnavailable();
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
        geohash: 'c2b2c0m',
        precision: 'exact'
      },
      seatsTotal: 3,
      seatsAvailable: 3,
      windowStart: sampleWindowStart(),
      windowEnd: sampleWindowEnd(),
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
  );
});

test('driver can edit own open post and cancel ride', async () => {
  skipIfUnavailable();
  const driverId = 'driver-open-edit';
  const context = testEnv.authenticatedContext(driverId);
  const db = context.firestore();
  const docRef = await createRidePost(db, driverId);

  await assertSucceeds(
    setDoc(
      docRef,
      {
        seatsAvailable: 2,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  );

  let snapshot = await assertSucceeds(getDoc(docRef));
  expect(snapshot.data()?.seatsAvailable).toBe(2);
  expect(snapshot.data()?.status).toBe('open');

  await assertSucceeds(
    setDoc(
      docRef,
      {
        status: 'canceled',
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  );

  snapshot = await assertSucceeds(getDoc(docRef));
  expect(snapshot.data()?.status).toBe('canceled');
});

test("other users cannot modify a driver's post", async () => {
  skipIfUnavailable();
  const driverId = 'driver-owner';
  const driverContext = testEnv.authenticatedContext(driverId);
  const driverDb = driverContext.firestore();
  const postRef = await createRidePost(driverDb, driverId);

  const otherUserContext = testEnv.authenticatedContext('passenger-1');
  const otherDb = otherUserContext.firestore();
  const otherRef = doc(otherDb, 'ridePosts', postRef.id);

  await assertFails(
    setDoc(
      otherRef,
      {
        destinationCampus: 'Downtown',
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  );
});

test('driver cannot post if an active trip exists', async () => {
  skipIfUnavailable();
  const driverId = 'driver-active-trip';
  const context = testEnv.authenticatedContext(driverId, {
    hasActiveTrip: true
  });
  const db = context.firestore();

  const docRef = doc(db, 'ridePosts', randomUUID());
  await assertFails(
    setDoc(
      docRef,
      buildRidePostCreateData({
        driverId,
        origin: {
          lat: 49.25,
          lng: -123.1,
          label: 'Downtown Vancouver',
          precision: 'exact'
        },
        destinationCampus: 'Burnaby',
        seatsTotal: 3,
        windowStart: sampleWindowStart(),
        windowEnd: sampleWindowEnd()
      })
    )
  );
});

test('status lock prevents updates once trip starts', async () => {
  skipIfUnavailable();
  const driverId = 'driver-trip-lock';
  const driverContext = testEnv.authenticatedContext(driverId);
  const backendContext = testEnv.authenticatedContext('backend-service', {
    backend: true
  });
  const driverDb = driverContext.firestore();
  const backendDb = backendContext.firestore();

  const postRef = await createRidePost(driverDb, driverId);

  const backendRef = doc(backendDb, 'ridePosts', postRef.id);
  await assertSucceeds(
    setDoc(
      backendRef,
      buildRidePostStatusUpdate({
        currentStatus: 'open',
        nextStatus: 'inTrip'
      }),
      { merge: true }
    )
  );

  await assertFails(
    setDoc(
      postRef,
      {
        seatsAvailable: 1,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  );

  await assertFails(
    setDoc(
      backendRef,
      {
        status: 'canceled',
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  );
});

test('supports indexed campus queries ordered by descending windowStart', async () => {
  skipIfUnavailable();
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
            label: 'Downtown Terminal',
            precision: 'exact'
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
