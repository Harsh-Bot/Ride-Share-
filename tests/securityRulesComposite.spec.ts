import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

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

test('unauthorized client write to composite score is denied', async () => {
  const riderId = 'rider-s1';
  const ctx = testEnv.authenticatedContext(riderId);
  const db = ctx.firestore();
  await assertFails(setDoc(doc(db, 'matches', riderId), { top: [{ postId: 'x', score: 0.9 }], updatedAt: Timestamp.now() }));
});

test('public read of open posts is allowed for authenticated clients', async () => {
  // Seed one open post
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = admin.firestore();
    await setDoc(doc(db, 'ridePosts', 'pub-open'), {
      driverId: 'driver-pub',
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 5*60_000)),
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
  });
  const ctx = testEnv.authenticatedContext('some-user');
  const db = ctx.firestore();
  const snap = await assertSucceeds(getDoc(doc(db, 'ridePosts', 'pub-open')));
  expect(snap.exists()).toBeTruthy();
});

test('tampered reliability/rating field by driver is blocked', async () => {
  const driverId = 'driver-tamper';
  const ctx = testEnv.authenticatedContext(driverId);
  const db = ctx.firestore();
  // Create should fail if spoofed fields present
  await assertFails(setDoc(doc(db, 'ridePosts', 'bad-1'), {
    driverId,
    origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
    destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
    windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 5*60_000)),
    driverReliability: 0.99, driverRating: 5.0,
    status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
  }));

  // Seed a valid post via backend bypass, then tamper as driver
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const adb = admin.firestore();
    await setDoc(doc(adb, 'ridePosts', 'ok-1'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 5*60_000)),
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
  });
  await assertFails(setDoc(doc(db, 'ridePosts', 'ok-1'), { driverReliability: 0.8, updatedAt: Timestamp.now() }, { merge: true } as any));
  await assertFails(setDoc(doc(db, 'ridePosts', 'ok-1'), { driverRating: 4.2, updatedAt: Timestamp.now() }, { merge: true } as any));
});
