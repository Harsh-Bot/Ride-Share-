import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { Timestamp, setDoc, doc, getDoc } from 'firebase/firestore';
import { recomputeMatchesForRider } from '../src/features/matching/functions';

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

const seedRider = async (db: any, riderId: string, pickup: { lat: number; lng: number }, campus = 'Burnaby', radiusMeters = 1500) => {
  await setDoc(doc(db, 'users', riderId), { matching: { destinationCampus: campus, pickup, radiusMeters } }, { merge: true });
};

test('driver posting updates matches in ≤2s', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const riderId = 'rider-match';
    const driverId = 'driver-match';
    await seedRider(db, riderId, { lat: 0, lng: 0.002 });
    const t0 = Date.now();
    await setDoc(doc(db, 'ridePosts', 'post-m1'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 2, seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 15*60_000)), driverReliability: 0.9, driverRating: 4.8,
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    await recomputeMatchesForRider(riderId, { db });
    const dt = Date.now() - t0;
    const matchDoc = await getDoc(doc(db, 'matches', riderId));
    expect(matchDoc.exists()).toBeTruthy();
    expect(matchDoc.data()?.top?.some((m: any) => m.postId === 'post-m1')).toBe(true);
    expect(dt).toBeLessThan(2000);
  });
});

test("editing driver's window updates match cache instantly", async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const riderId = 'rider-edit';
    const driverId = 'driver-edit';
    await seedRider(db, riderId, { lat: 0, lng: 0.002 });
    await setDoc(doc(db, 'ridePosts', 'post-e1'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 2, seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 15*60_000)),
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    await recomputeMatchesForRider(riderId, { db });
    let matchDoc = await getDoc(doc(db, 'matches', riderId));
    const firstWin = matchDoc.data()?.top?.find((m: any) => m.postId === 'post-e1')?.windowStartMs;

    // Edit windowStart to later time
    await setDoc(doc(db, 'ridePosts', 'post-e1'), { windowStart: Timestamp.fromDate(new Date(Date.now() + 120_000)), updatedAt: Timestamp.now() }, { merge: true });
    await recomputeMatchesForRider(riderId, { db });
    matchDoc = await getDoc(doc(db, 'matches', riderId));
    const secondWin = matchDoc.data()?.top?.find((m: any) => m.postId === 'post-e1')?.windowStartMs;
    expect(secondWin).toBeGreaterThan(firstWin);
  });
});

test('cancel post disappears from cache within 5s', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const riderId = 'rider-cancel';
    const driverId = 'driver-cancel';
    await seedRider(db, riderId, { lat: 0, lng: 0.0015 });
    await setDoc(doc(db, 'ridePosts', 'post-cx'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 15*60_000)),
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    await recomputeMatchesForRider(riderId, { db });
    let matchDoc = await getDoc(doc(db, 'matches', riderId));
    expect(matchDoc.data()?.top?.some((m: any) => m.postId === 'post-cx')).toBe(true);

    // Cancel post and recompute (simulate trigger delay < 5s)
    const t0 = Date.now();
    await setDoc(doc(db, 'ridePosts', 'post-cx'), { status: 'canceled', updatedAt: Timestamp.now() }, { merge: true });
    await recomputeMatchesForRider(riderId, { db });
    const dt = Date.now() - t0;
    matchDoc = await getDoc(doc(db, 'matches', riderId));
    expect(matchDoc.data()?.top?.some((m: any) => m.postId === 'post-cx')).toBe(false);
    expect(dt).toBeLessThan(5000);
  });
});

