import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { Timestamp, setDoc, doc, getDoc } from 'firebase/firestore';
import { requestRide } from '../src/features/rides/api/requests';
import { geodesicDistanceKm, geodesicDistanceMeters } from '../src/utils/geo';

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

test('rider exactly at radius boundary is included', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const driverId = 'driver-boundary';
    const riderId = 'rider-boundary';
    const origin = { lat: 0, lng: 0 };
    // choose a nearby point ~500m east at equator
    const pickup = { lat: 0, lng: 0.0045 };
    const dist = geodesicDistanceMeters({ lat: origin.lat, lng: origin.lng }, { lat: pickup.lat, lng: pickup.lng });

    await setDoc(doc(db, 'ridePosts', 'post-bound'), {
      driverId,
      origin: { lat: origin.lat, lng: origin.lng, label: 'Eq', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });

    const { requestId } = await requestRide({ postId: 'post-bound', riderId, destinationCampus: 'Burnaby', pickup: { lat: pickup.lat, lng: pickup.lng, label: 'P', isApprox: false }, radiusMeters: dist, db });
    const reqSnap = await getDoc(doc(db, 'rideRequests', requestId));
    expect(reqSnap.exists()).toBeTruthy();
  });
});

test('rider outside radius is excluded', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const driverId = 'driver-outside';
    const riderId = 'rider-outside';
    const origin = { lat: 0, lng: 0 };
    const pickup = { lat: 0, lng: 0.01 }; // ~1.1km at equator
    const dist = geodesicDistanceMeters(origin, pickup);

    await setDoc(doc(db, 'ridePosts', 'post-out'), {
      driverId,
      origin: { lat: origin.lat, lng: origin.lng, label: 'Eq', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });

    let threw = false;
    try {
      await requestRide({ postId: 'post-out', riderId, destinationCampus: 'Burnaby', pickup: { lat: pickup.lat, lng: pickup.lng, label: 'P', isApprox: false }, radiusMeters: dist - 1, db });
    } catch (e: any) {
      threw = true;
      expect(e?.message).toBe('OUT_OF_RADIUS');
    }
    expect(threw).toBe(true);
  });
});

test('geodesic distance accuracy within 2%', () => {
  const a = { lat: 0, lng: 0 };
  const b = { lat: 0, lng: 1 }; // 1 degree longitude at equator ~ 111.195 km
  const actualKm = geodesicDistanceKm(a, b);
  const expectedKm = 111.195; // using WGS84 average
  const errorPct = Math.abs(actualKm - expectedKm) / expectedKm;
  expect(errorPct).toBeLessThan(0.02);
});

