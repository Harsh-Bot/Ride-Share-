import {
  DestinationCampus,
  PostRideFormErrors,
  PostRideFormState,
  PostRideSubmitPayload
} from '../types/postRide';

const DEFAULT_WINDOW_DURATION_MINUTES = 20;

export const buildInitialPostRideFormState = (): PostRideFormState => ({
  originLabel: '',
  originLatitude: null,
  originLongitude: null,
  originPrecision: 'approximate',
  destinationCampus: null,
  seats: 1,
  departureOffsetMinutes: 0,
  windowDurationMinutes: DEFAULT_WINDOW_DURATION_MINUTES,
  locationPermission: 'unknown',
  allowManualOrigin: false
});

export const validatePostRideForm = (state: PostRideFormState): PostRideFormErrors => {
  const errors: PostRideFormErrors = {};

  if (!state.originLabel.trim()) {
    errors.origin = 'Origin is required.';
  }

  if (!state.destinationCampus) {
    errors.destinationCampus = 'Select a destination campus.';
  }

  if (state.seats <= 0) {
    errors.seats = 'Seats must be greater than zero.';
  }

  const now = Date.now();
  const windowStart = now + state.departureOffsetMinutes * 60_000;
  const windowEnd = windowStart + state.windowDurationMinutes * 60_000;
  if (windowEnd <= now) {
    errors.window = 'Departure window must end in the future.';
  }

  return errors;
};

export const canSubmitPostRideForm = (state: PostRideFormState) => {
  const errors = validatePostRideForm(state);
  return Object.keys(errors).length === 0;
};

export const buildPostRideSubmitPayload = (state: PostRideFormState): PostRideSubmitPayload => ({
  origin: {
    label: state.originLabel.trim(),
    latitude: state.originLatitude,
    longitude: state.originLongitude,
    precision: state.originPrecision
  },
  destinationCampus: state.destinationCampus!,
  seats: state.seats,
  departureOffsetMinutes: state.departureOffsetMinutes,
  windowDurationMinutes: state.windowDurationMinutes
});

export type PostRideFormAction =
  | { type: 'hydrate'; payload: Partial<PostRideFormState> }
  | { type: 'setDestination'; payload: DestinationCampus }
  | { type: 'setSeats'; payload: number }
  | { type: 'setWindowDuration'; payload: number }
  | { type: 'setDepartureOffset'; payload: number }
  | { type: 'setOriginLabel'; payload: string }
  | { type: 'setLocationPermission'; payload: PostRideFormState['locationPermission'] }
  | { type: 'setOriginCoordinates'; payload: { latitude: number; longitude: number } }
  | { type: 'setAllowManualOrigin'; payload: boolean }
  | { type: 'setOriginPrecision'; payload: PostRideFormState['originPrecision'] }
  | { type: 'reset' };

export const postRideFormReducer = (state: PostRideFormState, action: PostRideFormAction): PostRideFormState => {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.payload };
    case 'setDestination':
      return { ...state, destinationCampus: action.payload };
    case 'setSeats':
      return { ...state, seats: action.payload };
    case 'setWindowDuration':
      return { ...state, windowDurationMinutes: action.payload };
    case 'setDepartureOffset':
      return { ...state, departureOffsetMinutes: action.payload };
    case 'setOriginLabel':
      return { ...state, originLabel: action.payload };
    case 'setLocationPermission':
      return { ...state, locationPermission: action.payload };
    case 'setOriginCoordinates':
      return {
        ...state,
        originLatitude: action.payload.latitude,
        originLongitude: action.payload.longitude
      };
    case 'setAllowManualOrigin':
      return { ...state, allowManualOrigin: action.payload };
    case 'setOriginPrecision':
      return { ...state, originPrecision: action.payload };
    case 'reset':
      return buildInitialPostRideFormState();
    default:
      return state;
  }
};
