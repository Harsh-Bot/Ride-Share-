import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { Timestamp, setDoc, doc, getDoc } from 'firebase/firestore';
import { requestRide, acceptRequest, expireRequestIfNeeded } from '../src/features/rides/api/requests';

let testEnv: RulesTestEnvironment;
let shouldSkip = false;
const RULES_PATH = 'firebase/firestore.rules';

const loadFile = (p: string) => readFileSync(p, 'utf8');

const skipIfUnavailable = () => {
  if (shouldSkip) {
    test.skip(true, 'Firestore emulator not available');
  }
};

test.beforeAll(async () => {
  const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  const [host, portStr] = FIRESTORE_EMULATOR_HOST.split(':');
  const port = Number(portStr ?? 8080);
  try {
    testEnv = await initializeTestEnvironment({
      projectId: 'ride-share-dev',
      firestore: { rules: loadFile(RULES_PATH), host, port }
    });
  } catch (e) {
    console.warn('Skipping rideRequestFlow tests; emulator not reachable at', `${host}:${port}`);
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

test('auto-accept converts request to booking immediately when autoAccept=true', async () => {
  skipIfUnavailable();
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const adminDb = adminCtx.firestore();
    const driverId = 'driver-auto';
    const riderId = 'rider-1';
    await setDoc(doc(adminDb, 'ridePosts', 'post-1'), {
      driverId,
      origin: { lat: 49.28, lng: -123.12, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby',
      seatsTotal: 1,
      seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)),
      windowEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 60_000)),
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await setDoc(doc(adminDb, 'users', driverId), { settings: { autoAccept: true } });
    const { requestId } = await requestRide({
      postId: 'post-1',
      riderId,
      destinationCampus: 'Burnaby',
      pickup: { lat: 49.28, lng: -123.12, label: 'Meet', isApprox: false },
      seats: 1,
      db: adminDb
    });
    const reqSnap = await getDoc(doc(adminDb, 'rideRequests', requestId));
    expect(reqSnap.exists()).toBeTruthy();
    expect(reqSnap.data()?.status).toBe('booked');
  });
});

test('manual accept updates request to booked and persists', async () => {
  skipIfUnavailable();
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const adminDb = adminCtx.firestore();
    const driverId = 'driver-manual';
    const riderId = 'rider-2';
    await setDoc(doc(adminDb, 'ridePosts', 'post-2'), {
      driverId,
      origin: { lat: 49.28, lng: -123.12, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Surrey',
      seatsTotal: 2,
      seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)),
      windowEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 60_000)),
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    const { requestId } = await requestRide({
      postId: 'post-2',
      riderId,
      destinationCampus: 'Surrey',
      pickup: { lat: 49.28, lng: -123.12, label: 'Meet', isApprox: false },
      db: adminDb
    });
    await acceptRequest(requestId, { db: adminDb });
    const reqSnap = await getDoc(doc(adminDb, 'rideRequests', requestId));
    expect(reqSnap.data()?.status).toBe('booked');
  });
});

test('TTL expiry auto-declines and restores seat', async () => {
  skipIfUnavailable();
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const adminDb = adminCtx.firestore();
    const driverId = 'driver-ttl';
    const riderId = 'rider-3';
    await setDoc(doc(adminDb, 'ridePosts', 'post-3'), {
      driverId,
      origin: { lat: 49.28, lng: -123.12, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby',
      seatsTotal: 1,
      seatsAvailable: 0,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)),
      windowEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 60_000)),
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    const requestRef = doc(adminDb, 'rideRequests', 'req-ttl');
    await setDoc(requestRef, {
      postId: 'post-3',
      riderId,
      destinationCampus: 'Burnaby',
      status: 'pending',
      pickup: { lat: 49.28, lng: -123.12, label: 'Meet', isApprox: false },
      autoAccepted: false,
      bookingId: null,
      createdAt: Timestamp.fromDate(new Date(Date.now() - 11 * 60_000)),
      expiresAt: Timestamp.fromDate(new Date(Date.now() - 1 * 60_000))
    });
    await expireRequestIfNeeded('req-ttl', { db: adminDb, now: () => Date.now() });
    const reqSnap = await getDoc(requestRef);
    expect(reqSnap.data()?.status).toBe('expired');
    const postSnap = await getDoc(doc(adminDb, 'ridePosts', 'post-3'));
    expect(postSnap.data()?.seatsAvailable).toBe(1);
  });
});

test('two riders cannot claim the same last seat (one wins)', async () => {
  skipIfUnavailable();
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const adminDb = adminCtx.firestore();
    const driverId = 'driver-race';
    const rider1 = 'rider-a';
    const rider2 = 'rider-b';
    await setDoc(doc(adminDb, 'ridePosts', 'post-4'), {
      driverId,
      origin: { lat: 49.28, lng: -123.12, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby',
      seatsTotal: 1,
      seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)),
      windowEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 60_000)),
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    let win = 0;
    const p1 = requestRide({ postId: 'post-4', riderId: rider1, destinationCampus: 'Burnaby', pickup: { lat: 1, lng: 2, label: 'A', isApprox: false }, db: adminDb });
    const p2 = requestRide({ postId: 'post-4', riderId: rider2, destinationCampus: 'Burnaby', pickup: { lat: 1, lng: 2, label: 'B', isApprox: false }, db: adminDb });
    await Promise.allSettled([p1, p2]).then((results) => {
      win = results.filter((r) => r.status === 'fulfilled').length;
    });
    expect(win).toBe(1);
    const postSnap = await getDoc(doc(adminDb, 'ridePosts', 'post-4'));
    expect(postSnap.data()?.seatsAvailable).toBe(0);
  });
});
