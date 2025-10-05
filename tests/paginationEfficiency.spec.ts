import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { Timestamp, setDoc, doc } from 'firebase/firestore';
import { paginatedSearch } from '../src/features/rides/api/paginatedSearch';

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

const seedPosts = async (db: any, count = 60) => {
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const id = `p-${i}`;
    // Recent first (larger wsMs newer)
    const wsMs = now + (count - i) * 60_000;
    await setDoc(doc(db, 'ridePosts', id), {
      driverId: `d-${i}`,
      origin: { lat: 0, lng: 0.001 + i * 0.000001, label: id, geohash: 'x', precision: 'exact' },
      destinationCampus: 'Burnaby', seatsTotal: 2, seatsAvailable: 2,
      windowStart: Timestamp.fromDate(new Date(wsMs)), windowEnd: Timestamp.fromDate(new Date(wsMs + 30 * 60_000)),
      status: 'open', createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
  }
};

test('50+ drivers in area → paginated 10-per-page and cursor continuity', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    await seedPosts(db, 60);
    const riderId = 'rider-pg';
    const pickup = { lat: 0, lng: 0 };
    const radius = 5000;

    const all: string[] = [];
    let cursor: any = undefined;
    for (let page = 0; page < 6; page++) {
      const res = await paginatedSearch({ riderId, destinationCampus: 'Burnaby', pickup, radiusMeters: radius, limit: 10, cursor, db });
      expect(res.items.length).toBe(10);
      // no duplicates
      for (const it of res.items) {
        expect(all.includes(it.id)).toBeFalsy();
        all.push(it.id);
      }
      cursor = res.nextCursor;
      if (!cursor) break;
    }
    expect(all.length).toBe(60);
  });
});

test('exceeding query rate returns throttling error', async () => {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const db = adminCtx.firestore();
    await seedPosts(db, 5);
    const riderId = 'rider-throttle';
    const pickup = { lat: 0, lng: 0 };
    const radius = 5000;
    let threw = false;
    for (let i = 0; i < 11; i++) {
      try {
        await paginatedSearch({ riderId, destinationCampus: 'Burnaby', pickup, radiusMeters: radius, limit: 1, db });
      } catch (e: any) {
        if (e?.message === 'THROTTLED') {
          threw = true;
          break;
        }
      }
    }
    expect(threw).toBe(true);
  });
});

