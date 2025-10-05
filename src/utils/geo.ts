// Geodesic distance utilities

export const EARTH_RADIUS_M = 6371e3;

export const toRadians = (deg: number) => (deg * Math.PI) / 180;

export const geodesicDistanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const φ1 = toRadians(a.lat);
  const φ2 = toRadians(b.lat);
  const Δφ = toRadians(b.lat - a.lat);
  const Δλ = toRadians(b.lng - a.lng);
  const sinΔφ = Math.sin(Δφ / 2);
  const sinΔλ = Math.sin(Δλ / 2);
  const x = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ;
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return EARTH_RADIUS_M * y;
};

export const geodesicDistanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number =>
  geodesicDistanceMeters(a, b) / 1000;

