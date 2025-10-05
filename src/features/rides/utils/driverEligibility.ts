import type { Role } from '../../../store/useRoleStore';

export const shouldShowDriverPostCta = (role: Role, hasActiveTrip: boolean) =>
  role === 'driver' && !hasActiveTrip;
