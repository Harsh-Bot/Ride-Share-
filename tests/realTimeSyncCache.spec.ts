import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { Timestamp, setDoc, doc, getDoc } from 'firebase/firestore';
import { recomputeMatchesForRider, sweepMatchesForRider } from '../src/features/matching/functions';

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

test('post expiration removes from cache within 5s', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const riderId = 'rider-exp';
    const driverId = 'driver-exp';
    const now = Date.now();
    await setDoc(doc(db, 'users', riderId), { matching: { destinationCampus: 'Burnaby', pickup: { lat: 0, lng: 0.002 }, radiusMeters: 1500 } }, { merge: true });
    await setDoc(doc(db, 'ridePosts', 'post-exp-rt'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(now + 60_000)), windowEnd: Timestamp.fromDate(new Date(now + 120_000)),
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    await recomputeMatchesForRider(riderId, { db, now: () => now });
    let m = await getDoc(doc(db, 'matches', riderId));
    expect(m.data()?.top?.some((x: any) => x.postId === 'post-exp-rt')).toBe(true);
    // Make it expired
    await setDoc(doc(db, 'ridePosts', 'post-exp-rt'), { windowEnd: Timestamp.fromDate(new Date(now - 1_000)), updatedAt: Timestamp.now() }, { merge: true });
    const t0 = Date.now();
    await sweepMatchesForRider(riderId, { db, now: () => now });
    const dt = Date.now() - t0;
    m = await getDoc(doc(db, 'matches', riderId));
    expect(m.data()?.top?.some((x: any) => x.postId === 'post-exp-rt')).toBe(false);
    expect(dt).toBeLessThan(5000);
  });
});

