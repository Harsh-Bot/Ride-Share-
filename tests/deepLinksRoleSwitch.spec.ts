import { test, expect } from '@playwright/test';
import { handleRideInviteLink, parseRideLink } from '../src/features/rides/deeplink/rideLink';

test('deep link opens correct ride details', () => {
  const url = 'app://rides/live/abc123';
  const parsed = parseRideLink(url);
  expect(parsed.rideId).toBe('abc123');
  const outcome = handleRideInviteLink({ url, role: 'rider', hasActiveTrip: false });
  expect(outcome.redirectToRideDetails).toBe(true);
  expect(outcome.rideId).toBe('abc123');
});

test('prompt shows when role mismatch', () => {
  const url = 'https://sfurideshare.page.link/rides/live/xyz789';
  const outcome = handleRideInviteLink({ url, role: 'driver', hasActiveTrip: false });
  expect(outcome.promptRoleSwitch).toBe(true);
  expect(outcome.redirectToRideDetails).toBe(false);
});

test('blocked when active trip present', () => {
  const url = 'app://rides/live/abc123';
  const outcome = handleRideInviteLink({ url, role: 'rider', hasActiveTrip: true });
  expect(outcome.blockedReason).toMatch(/active trip/i);
  expect(outcome.redirectToRideDetails).toBe(false);
});

test('works after switching role', () => {
  const url = 'app://rides/live/abc123';
  const pre = handleRideInviteLink({ url, role: 'driver', hasActiveTrip: false });
  expect(pre.promptRoleSwitch).toBe(true);
  const post = handleRideInviteLink({ url, role: 'rider', hasActiveTrip: false });
  expect(post.redirectToRideDetails).toBe(true);
});

