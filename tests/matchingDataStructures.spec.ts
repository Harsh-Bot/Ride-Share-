import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { collection, doc, getDocs, orderBy, query, setDoc, Timestamp, where, getDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { buildRidePostCreateData } from '../src/services/firestore/ridePosts';

let testEnv: RulesTestEnvironment;
let shouldSkip = false;
const RULES_PATH = 'firebase/firestore.rules';
const loadFile = (p: string) => readFileSync(p, 'utf8');

const skipIfUnavailable = () => { if (shouldSkip) test.skip(true, 'Firestore emulator not available'); };

test.beforeAll(async () => {
  const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  const [host, portStr] = FIRESTORE_EMULATOR_HOST.split(':');
  const port = Number(portStr ?? 8080);
  try {
    testEnv = await initializeTestEnvironment({ projectId: 'ride-share-dev', firestore: { rules: loadFile(RULES_PATH), host, port } });
  } catch {
    shouldSkip = true;
  }
});

test.afterAll(async () => { if (testEnv && !shouldSkip) await testEnv.cleanup(); });
test.afterEach(async () => { if (testEnv && !shouldSkip) await testEnv.clearFirestore(); });

const createPost = async (db: Firestore, driverId: string, destinationCampus: string, rel = 0.8, rating = 4.6) => {
  // Create using admin DB to allow backend-only fields, then return a client ref at same path
  let path = '' as string;
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const adb = admin.firestore();
    const adminRef = doc(collection(adb, 'ridePosts'));
    path = adminRef.path;
    await setDoc(adminRef, buildRidePostCreateData({
      driverId,
      origin: { lat: 49.28, lng: -123.12, label: 'X', precision: 'exact' },
      destinationCampus,
      seatsTotal: 2,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)),
      windowEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 60_000)),
      seatsAvailable: 2,
      driverReliability: rel,
      driverRating: rating
    }));
  });
  return doc(db, path);
};

test('schema permits geohash/driverReliability/driverRating and queries match indexes', async () => {
  skipIfUnavailable();
  const ctx = testEnv.authenticatedContext('driver-a');
  const db = ctx.firestore();
  const ref = await createPost(db, 'driver-a', 'Burnaby', 0.9, 4.9);
  const snap = await assertSucceeds(getDoc(ref));
  expect(snap.exists()).toBeTruthy();
  const data = snap.data() as any;
  expect(typeof data.geohash).toBe('string');
  expect(typeof data.driverReliability === 'number' || data.driverReliability === undefined).toBeTruthy();
  expect(typeof data.driverRating === 'number' || data.driverRating === undefined).toBeTruthy();

  // compound index (destinationCampus, windowStart desc, geohash asc)
  const q1 = query(collection(db, 'ridePosts'), where('destinationCampus', '==', 'Burnaby'), orderBy('windowStart', 'desc'), orderBy('geohash', 'asc'));
  const list1 = await assertSucceeds(getDocs(q1));
  expect(list1.docs.length).toBeGreaterThanOrEqual(1);

  // secondary index (driverReliability desc, driverRating desc)
  const q2 = query(collection(db, 'ridePosts'), orderBy('driverReliability', 'desc'), orderBy('driverRating', 'desc'));
  const list2 = await assertSucceeds(getDocs(q2));
  expect(list2.docs.length).toBeGreaterThanOrEqual(1);
});

test('invalid schema (missing windowStart) rejected', async () => {
  skipIfUnavailable();
  const ctx = testEnv.authenticatedContext('driver-b');
  const db = ctx.firestore();
  const ref = doc(collection(db, 'ridePosts'));
  await assertFails(setDoc(ref, {
    driverId: 'driver-b',
    origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
    destinationCampus: 'Surrey',
    seatsTotal: 1,
    seatsAvailable: 1,
    // windowStart missing
    windowEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 60_000)),
    status: 'open',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }));
});
