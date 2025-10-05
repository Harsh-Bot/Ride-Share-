import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { Timestamp, setDoc, doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { requestRide } from '../src/features/rides/api/requests';
import { searchOpenRides } from '../src/features/rides/api/search';

let testEnv: RulesTestEnvironment;
const RULES_PATH = 'firebase/firestore.rules';
const loadFile = (p: string) => readFileSync(p, 'utf8');

test.beforeAll(async () => {
  const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  const [host, portStr] = FIRESTORE_EMULATOR_HOST.split(':');
  const port = Number(portStr ?? 8080);
  testEnv = await initializeTestEnvironment({ projectId: 'ride-share-dev', firestore: { rules: loadFile(RULES_PATH), host, port } });
});

test.afterAll(async () => { await testEnv.cleanup(); });
test.afterEach(async () => { await testEnv.clearFirestore(); });

test('out-of-radius request blocked and changing radius enables valid request', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const driverId = 'driver-geo';
    const riderId = 'rider-geo';
    await setDoc(doc(db, 'ridePosts', 'post-geo'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });

    let threw = false;
    try {
      await requestRide({ postId: 'post-geo', riderId, destinationCampus: 'Burnaby', pickup: { lat: 0.1, lng: 0.1, label: 'Far', isApprox: false }, radiusMeters: 500, db });
    } catch (e: any) {
      threw = true;
      expect(e?.message).toBe('OUT_OF_RADIUS');
    }
    expect(threw).toBe(true);
    const postAfter = await getDoc(doc(db, 'ridePosts', 'post-geo'));
    expect(postAfter.data()?.seatsAvailable).toBe(1);

    // Increase radius to allow
    const { requestId } = await requestRide({ postId: 'post-geo', riderId, destinationCampus: 'Burnaby', pickup: { lat: 0.001, lng: 0.001, label: 'Near', isApprox: false }, radiusMeters: 500, db });
    const req = await getDoc(doc(db, 'rideRequests', requestId));
    expect(req.exists()).toBeTruthy();
  });
});

test('low-rated drivers filtered out if rating < threshold', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    await setDoc(doc(db, 'users', 'd-low'), { rating: 3.5 });
    await setDoc(doc(db, 'users', 'd-high'), { rating: 4.8 });
    await setDoc(doc(db, 'ridePosts', 'p-low'), {
      driverId: 'd-low', origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' }, destinationCampus: 'Surrey', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    await setDoc(doc(db, 'ridePosts', 'p-high'), {
      driverId: 'd-high', origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' }, destinationCampus: 'Surrey', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    const results = await searchOpenRides({ destinationCampus: 'Surrey', minDriverRating: 4.0, db });
    const ids = results.map((r) => r.id).sort();
    expect(ids).toEqual(['p-high']);
  });
});

test('no-show logic correctly disables auto-accept', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const driverId = 'driver-ns';
    const riderId = 'rider-ns';
    await setDoc(doc(db, 'users', driverId), { settings: { autoAccept: true } });
    await setDoc(doc(db, 'users', riderId), { stats: { noShows7d: 3 } });
    await setDoc(doc(db, 'ridePosts', 'post-ns'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    const { requestId } = await requestRide({ postId: 'post-ns', riderId, destinationCampus: 'Burnaby', pickup: { lat: 0, lng: 0, label: 'P', isApprox: false }, db });
    const req = await getDoc(doc(db, 'rideRequests', requestId));
    expect(req.data()?.status).toBe('pending');
    // ensure no booking exists
    const bookings = await getDocs(collection(db, 'bookings'));
    expect(bookings.docs.length).toBe(0);
  });
});

