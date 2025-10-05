import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { Timestamp, setDoc, doc, getDoc, getFirestore } from 'firebase/firestore';
import { requestRide, cancelRequest, cancelBooking, acceptRequest } from '../src/features/rides/api/requests';

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

test('one-active rule auto-cancels previous pending on same campus', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const driverId = 'driver-oa';
    const riderId = 'rider-oa';
    await setDoc(doc(db, 'ridePosts', 'post-a'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 2, seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    const r1 = await requestRide({ postId: 'post-a', riderId, destinationCampus: 'Burnaby', pickup: { lat: 0, lng: 0, label: 'P', isApprox: false }, db });
    const r2 = await requestRide({ postId: 'post-a', riderId, destinationCampus: 'Burnaby', pickup: { lat: 0, lng: 0, label: 'P', isApprox: false }, db });
    const req1 = await getDoc(doc(db, 'rideRequests', r1.requestId));
    const req2 = await getDoc(doc(db, 'rideRequests', r2.requestId));
    const post = await getDoc(doc(db, 'ridePosts', 'post-a'));
    expect(req1.data()?.status).toBe('canceled');
    expect(req2.data()?.status).toBe('pending');
    // seats: cancel (+1) then request (-1) → unchanged
    expect(post.data()?.seatsAvailable).toBe(2);
  });
});

test('cancel booking returns seat', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const driverId = 'driver-cb';
    const riderId = 'rider-cb';
    await setDoc(doc(db, 'ridePosts', 'post-b'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Surrey', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    const r = await requestRide({ postId: 'post-b', riderId, destinationCampus: 'Surrey', pickup: { lat: 0, lng: 0, label: 'P', isApprox: false }, db });
    await acceptRequest(r.requestId, { db });
    // There will be a booking doc; to keep simple, increment seat via cancelRequest flow on pending is not valid; cancelBooking needs bookingId; for demo we fetch booking id from request
    const reqSnap = await getDoc(doc(db, 'rideRequests', r.requestId));
    const bookingId = reqSnap.data()?.bookingId;
    expect(bookingId).toBeTruthy();
    await cancelBooking(bookingId, { db });
    const post = await getDoc(doc(db, 'ridePosts', 'post-b'));
    expect(post.data()?.seatsAvailable).toBe(1);
  });
});

