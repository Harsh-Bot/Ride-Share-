import type { Role } from '../../../store/useRoleStore';

export type RideLinkOutcome = {
  rideId: string | null;
  redirectToRideDetails: boolean;
  promptRoleSwitch: boolean;
  blockedReason: string | null;
};

export const parseRideLink = (url: string): { rideId: string | null } => {
  try {
    // Accept urls like app://rides/live/:rideId or https://.../rides/live/:rideId or with ?postId=...
    const u = new URL(url);
    const host = u.host; // e.g., 'rides' for app://rides/live/abc
    const rawPath = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
    const pathname = host === 'rides' && rawPath.startsWith('live/') ? `rides/${rawPath}` : rawPath;
    if (pathname.startsWith('rides/live/')) {
      const parts = pathname.split('/');
      const rideId = parts[2] ?? null;
      return { rideId };
    }
    const postIdParam = u.searchParams.get('postId');
    if (postIdParam) return { rideId: postIdParam };
  } catch {}
  return { rideId: null };
};

export const handleRideInviteLink = ({
  url,
  role,
  hasActiveTrip
}: {
  url: string;
  role: Role;
  hasActiveTrip: boolean;
}): RideLinkOutcome => {
  const { rideId } = parseRideLink(url);
  if (!rideId) {
    return { rideId: null, redirectToRideDetails: false, promptRoleSwitch: false, blockedReason: null };
  }
  if (hasActiveTrip) {
    return { rideId, redirectToRideDetails: false, promptRoleSwitch: false, blockedReason: 'Active trip in progress' };
  }
  const promptRoleSwitch = role !== 'rider';
  return {
    rideId,
    redirectToRideDetails: !promptRoleSwitch,
    promptRoleSwitch,
    blockedReason: null
  };
};
