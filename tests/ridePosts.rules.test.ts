import { afterAll, afterEach, beforeAll, describe, it, expect } from '@jest/globals';
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore';
import { initEmulator, Timestamp } from './helpers/firestore';
import { randomUUID } from 'node:crypto';

// These tests require the Firestore emulator + rules to be running.
// They are skipped automatically when FIRESTORE_EMULATOR_HOST is not set.

let ctx: Awaited<ReturnType<typeof initEmulator>>;

beforeAll(async () => {
  ctx = await initEmulator();
});

afterEach(async () => {
  // With the web SDK there is no simple clearAll; leave data in emulator between tests.
});

afterAll(async () => {
  // Nothing to cleanup; emulator process is external.
});

const itIf = (cond: unknown) => (cond ? it : it.skip);

describe('ridePosts security rules (emulator)', () => {
  itIf(!!ctx)('allows basic driver post create with required fields', async () => {
    // This test assumes your rules permit anonymous auth as a valid user.
    // If not, sign-in with a seeded test user in the Auth emulator.
    const { db, uid } = ctx!;
    const windowStart = Timestamp.fromDate(new Date('2025-10-05T12:00:00Z'));
    const windowEnd = Timestamp.fromDate(new Date('2025-10-05T13:00:00Z'));
    const docRef = doc(db, 'ridePosts', randomUUID());

    await setDoc(docRef, {
      driverId: uid,
      origin: {
        lat: 49.2781,
        lng: -122.9199,
        label: 'Burnaby Campus Parking',
        geohash: 'c2b2c0m'
      },
      destinationCampus: 'Surrey',
      seatsTotal: 3,
      seatsAvailable: 3,
      windowStart,
      windowEnd,
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const snap = await getDoc(docRef);
    expect(snap.exists()).toBe(true);
  });

  itIf(!!ctx)('supports campus query ordering by windowStart desc', async () => {
    const { db, uid } = ctx!;
    const baseTime = Timestamp.fromDate(new Date('2025-10-05T10:00:00Z'));
    const offsets = [0, 30, 60];
    for (const off of offsets) {
      await setDoc(doc(db, 'ridePosts', randomUUID()), {
        driverId: uid,
        origin: { lat: 49.2827, lng: -123.1187, label: 'Downtown Terminal', geohash: 'c2b2c0m' },
        destinationCampus: 'Burnaby',
        seatsTotal: 3,
        seatsAvailable: 3,
        windowStart: Timestamp.fromMillis(baseTime.toMillis() + off * 60_000),
        windowEnd: Timestamp.fromMillis(baseTime.toMillis() + (off + 30) * 60_000),
        status: 'open',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }

    const q = query(
      collection(db, 'ridePosts'),
      where('destinationCampus', '==', 'Burnaby'),
      orderBy('windowStart', 'desc')
    );
    const snap = await getDocs(q);
    const times = snap.docs.map((d) => d.data().windowStart.toMillis());
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });
});

