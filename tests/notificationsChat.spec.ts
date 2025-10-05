import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { Timestamp, setDoc, doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { requestRide, acceptRequest, expireRequestIfNeeded } from '../src/features/rides/api/requests';
import { cancelRidePostWithNotify } from '../src/features/rides/api/postCancel';

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

test('push fires on every event type and within 2s; chat thread links on booking', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    const driverId = 'driver-ntf';
    const riderId = 'rider-ntf';

    // seed post and driver autoAccept=false
    await setDoc(doc(db, 'users', driverId), { settings: { autoAccept: false } });
    await setDoc(doc(db, 'ridePosts', 'post-ntf'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });

    const t0 = Date.now();
    const { requestId } = await requestRide({ postId: 'post-ntf', riderId, destinationCampus: 'Burnaby', pickup: { lat: 0, lng: 0, label: 'P', isApprox: false }, db });
    // request_created notification for driver
    const notifSnap1 = await getDocs(collection(db, 'notifications'));
    expect(notifSnap1.docs.some((d) => d.data().type === 'request_created')).toBe(true);
    expect(Date.now() - t0).toBeLessThan(2000);

    // booking confirmed and chat thread
    await acceptRequest(requestId, { db });
    const notifSnap2 = await getDocs(collection(db, 'notifications'));
    expect(notifSnap2.docs.some((d) => d.data().type === 'booking_confirmed')).toBe(true);
    const req = await getDoc(doc(db, 'rideRequests', requestId));
    const bookingId = req.data()?.bookingId;
    const chat = await getDoc(doc(db, 'chatThreads', bookingId));
    expect(chat.exists()).toBeTruthy();

    // expire request on a separate post to generate request_expired
    await setDoc(doc(db, 'ridePosts', 'post-exp'), {
      driverId,
      origin: { lat: 0, lng: 0, label: 'X', geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 1, seatsAvailable: 0,
      windowStart: Timestamp.fromDate(new Date(Date.now() + 60_000)), windowEnd: Timestamp.fromDate(new Date(Date.now() + 30*60_000)), status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
    await setDoc(doc(db, 'rideRequests', 'req-exp'), {
      postId: 'post-exp', riderId, destinationCampus: 'Burnaby', status: 'pending', pickup: { lat: 0, lng: 0, label: 'P', isApprox: false }, autoAccepted: false, bookingId: null,
      createdAt: Timestamp.fromDate(new Date(Date.now() - 11 * 60_000)), expiresAt: Timestamp.fromDate(new Date(Date.now() - 1 * 60_000))
    });
    await expireRequestIfNeeded('req-exp', { db, now: () => Date.now() });
    const notifSnap3 = await getDocs(collection(db, 'notifications'));
    expect(notifSnap3.docs.some((d) => d.data().type === 'request_expired' && d.data().data?.message)).toBe(true);

    // post canceled
    await cancelRidePostWithNotify('post-ntf', { db });
    const notifSnap4 = await getDocs(collection(db, 'notifications'));
    expect(notifSnap4.docs.some((d) => d.data().type === 'post_canceled')).toBe(true);
  });
});

