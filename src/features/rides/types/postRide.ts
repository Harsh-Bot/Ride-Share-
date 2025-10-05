export type DestinationCampus = 'Burnaby' | 'Surrey';

export type OriginPrecision = 'exact' | 'approximate';

export type PostRideFormState = {
  originLabel: string;
  originLatitude: number | null;
  originLongitude: number | null;
  originPrecision: OriginPrecision;
  destinationCampus: DestinationCampus | null;
  seats: number;
  departureOffsetMinutes: number;
  windowDurationMinutes: number;
  locationPermission: 'unknown' | 'granted' | 'denied';
  allowManualOrigin: boolean;
};

export type PostRideFormErrors = Partial<{
  origin: string;
  destinationCampus: string;
  window: string;
  seats: string;
}>;

export type PostRideSubmitPayload = {
  origin: {
    label: string;
    latitude: number | null;
    longitude: number | null;
    precision: OriginPrecision;
  };
  destinationCampus: DestinationCampus;
  seats: number;
  departureOffsetMinutes: number;
  windowDurationMinutes: number;
};
