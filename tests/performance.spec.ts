import { test, expect } from '@playwright/test';
import { RideFeedController, RideFeedItem } from '../src/features/rides/hooks/useRideFeed';

test('ride list loads under 2 s with mock data', async () => {
  const items: RideFeedItem[] = Array.from({ length: 1000 }).map((_, i) => ({ id: `p${i}`, destinationCampus: i % 2 ? 'Burnaby' : 'Surrey', seatsAvailable: (i % 3) + 1, status: 'open' }));
  const controller = new RideFeedController({
    subscribe: ({ onSnapshot }) => {
      // single server snapshot
      setTimeout(() => onSnapshot(items.slice(0, 50), true), 10);
      return () => {};
    },
    refreshFn: async () => {
      // simulate network latency
      await new Promise((r) => setTimeout(r, 200));
      return items;
    },
    now: () => Date.now()
  });

  controller.subscribe(() => {});
  const t0 = Date.now();
  await controller.refresh();
  const dt = Date.now() - t0;
  expect(dt).toBeLessThan(2000);
  expect(controller.getState().items.length).toBe(1000);
});

