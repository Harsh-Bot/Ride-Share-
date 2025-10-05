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

const seed = async (db: any, riderId: string) => {
  await setDoc(doc(db, 'users', riderId), { matching: { destinationCampus: 'Burnaby', pickup: { lat: 0, lng: 0 }, radiusMeters: 1500 } }, { merge: true });
};

test('ordering respects composite score and proximity tie-break', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const riderId = 'rider-score-1';
    await seed(db, riderId);
    const baseNow = Date.now();

    // A: 10 min away, 100m, rel 0.9, rating 4.5
    await setDoc(doc(db, 'ridePosts', 'A'), {
      driverId: 'dA',
      origin: { lat: 0, lng: 0.0009, label: 'A', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 2, seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(baseNow + 10 * 60_000)), windowEnd: Timestamp.fromDate(new Date(baseNow + 20 * 60_000)),
      driverReliability: 0.9, driverRating: 4.5,
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    // B: same time/distance, higher reliability 0.95, rating 4.4 -> should rank above A (weights favor reliability over small rating gap)
    await setDoc(doc(db, 'ridePosts', 'B'), {
      driverId: 'dB',
      origin: { lat: 0, lng: 0.0009, label: 'B', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 2, seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(baseNow + 10 * 60_000)), windowEnd: Timestamp.fromDate(new Date(baseNow + 20 * 60_000)),
      driverReliability: 0.95, driverRating: 4.4,
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    // C: further distance 600m, later 20min, high rating 4.9
    await setDoc(doc(db, 'ridePosts', 'C'), {
      driverId: 'dC',
      origin: { lat: 0, lng: 0.0054, label: 'C', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 2, seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(baseNow + 20 * 60_000)), windowEnd: Timestamp.fromDate(new Date(baseNow + 30 * 60_000)),
      driverReliability: 0.8, driverRating: 4.9,
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });

    await recomputeMatchesForRider(riderId, { db, now: () => baseNow });
    const docSnap = await getDoc(doc(db, 'matches', riderId));
    const ids = docSnap.data()?.top?.map((m: any) => m.postId);
    expect(ids[0]).toBe('B');
    expect(ids.includes('A')).toBeTruthy();
  });
});

test('drop in rating lowers rank on recompute', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const riderId = 'rider-score-2';
    await seed(db, riderId);
    const baseNow = Date.now();

    await setDoc(doc(db, 'ridePosts', 'X'), {
      driverId: 'dX',
      origin: { lat: 0, lng: 0.0009, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 2, seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(baseNow + 10 * 60_000)), windowEnd: Timestamp.fromDate(new Date(baseNow + 20 * 60_000)),
      driverReliability: 0.9, driverRating: 4.8,
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    await setDoc(doc(db, 'ridePosts', 'Y'), {
      driverId: 'dY',
      origin: { lat: 0, lng: 0.0009, label: 'Y', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 2, seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(baseNow + 10 * 60_000)), windowEnd: Timestamp.fromDate(new Date(baseNow + 20 * 60_000)),
      driverReliability: 0.9, driverRating: 4.6,
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });

    await recomputeMatchesForRider(riderId, { db, now: () => baseNow });
    let docSnap = await getDoc(doc(db, 'matches', riderId));
    let ids = docSnap.data()?.top?.map((m: any) => m.postId);
    expect(ids[0]).toBe('X');

    // Lower rating for X, recompute -> Y should outrank
    await setDoc(doc(db, 'ridePosts', 'X'), { driverRating: 3.0, updatedAt: Timestamp.now() }, { merge: true });
    await recomputeMatchesForRider(riderId, { db, now: () => baseNow });
    docSnap = await getDoc(doc(db, 'matches', riderId));
    ids = docSnap.data()?.top?.map((m: any) => m.postId);
    expect(ids[0]).toBe('Y');
  });
});
