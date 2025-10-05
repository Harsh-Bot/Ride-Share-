import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform
} from 'react-native';
import type { LocationObject } from 'expo-location';
import * as Location from 'expo-location';
import type {
  DestinationCampus,
  PostRideFormErrors,
  PostRideFormState,
  PostRideSubmitPayload
} from '../types/postRide';
import {
  buildInitialPostRideFormState,
  buildPostRideSubmitPayload,
  canSubmitPostRideForm,
  postRideFormReducer,
  PostRideFormAction,
  validatePostRideForm
} from '../utils/postRideForm';

const DESTINATION_OPTIONS: Array<DestinationCampus> = ['Burnaby', 'Surrey'];

export type LocationPermissionResult = {
  status: Location.PermissionStatus;
};

type LocationService = {
  requestPermission: () => Promise<LocationPermissionResult>;
  getLastKnownPosition: () => Promise<LocationObject | null>;
};

type PostRideSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: PostRideSubmitPayload) => void;
  locationService?: LocationService;
};

const DEFAULT_LOCATION_SERVICE: LocationService = {
  requestPermission: () => Location.requestForegroundPermissionsAsync(),
  getLastKnownPosition: () => Location.getLastKnownPositionAsync({})
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const PostRideSheet = ({
  visible,
  onClose,
  onSubmit,
  locationService = DEFAULT_LOCATION_SERVICE
}: PostRideSheetProps) => {
  const [state, dispatch] = useReducer(postRideFormReducer, buildInitialPostRideFormState());
  const [errors, setErrors] = useState<PostRideFormErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const hydrateLocation = async () => {
      if (!visible) {
        return;
      }
      dispatch({ type: 'reset' });
      setErrors({});
      setHasAttemptedSubmit(false);
      try {
        const permission = await locationService.requestPermission();
        if (!isMounted) {
          return;
        }
        if (permission.status === 'granted') {
          dispatch({ type: 'setLocationPermission', payload: 'granted' });
          const latestLocation = await locationService.getLastKnownPosition();
          if (!isMounted) {
            return;
          }
          if (latestLocation?.coords) {
            dispatch({
              type: 'hydrate',
              payload: {
                originLatitude: latestLocation.coords.latitude,
                originLongitude: latestLocation.coords.longitude,
                originLabel: 'Current location',
                originPrecision: 'exact'
              }
            });
          }
        } else {
          dispatch({ type: 'setLocationPermission', payload: 'denied' });
          dispatch({ type: 'setAllowManualOrigin', payload: true });
          dispatch({ type: 'setOriginPrecision', payload: 'approximate' });
        }
      } catch (error) {
        console.warn('Failed to hydrate location for post ride form', error);
        if (!isMounted) {
          return;
        }
        dispatch({ type: 'setLocationPermission', payload: 'denied' });
        dispatch({ type: 'setAllowManualOrigin', payload: true });
      }
    };

    hydrateLocation();

    return () => {
      isMounted = false;
    };
  }, [visible, locationService]);

  useEffect(() => {
    if (hasAttemptedSubmit) {
      setErrors(validatePostRideForm(state));
    }
  }, [state, hasAttemptedSubmit]);

  const isSubmitEnabled = useMemo(() => canSubmitPostRideForm(state), [state]);

  const handleDestinationSelect = (destination: DestinationCampus) => {
    dispatch({ type: 'setDestination', payload: destination });
  };

  const adjustSeats = (delta: number) => {
    const next = clamp(state.seats + delta, 1, 5);
    dispatch({ type: 'setSeats', payload: next });
  };

  const adjustWindowDuration = (delta: number) => {
    const next = clamp(state.windowDurationMinutes + delta, 5, 60);
    dispatch({ type: 'setWindowDuration', payload: next });
  };

  const adjustDepartureOffset = (delta: number) => {
    const next = clamp(state.departureOffsetMinutes + delta, 0, 120);
    dispatch({ type: 'setDepartureOffset', payload: next });
  };

  const handleManualOriginToggle = (allowManual: boolean) => {
    dispatch({ type: 'setAllowManualOrigin', payload: allowManual });
    if (allowManual) {
      dispatch({ type: 'setOriginPrecision', payload: 'approximate' });
      dispatch({ type: 'hydrate', payload: { originLabel: '', originLatitude: null, originLongitude: null } });
    } else {
      dispatch({ type: 'setOriginPrecision', payload: 'exact' });
    }
  };

  const handleClose = () => {
    dispatch({ type: 'reset' });
    setErrors({});
    setHasAttemptedSubmit(false);
    onClose();
  };

  const handleSubmit = () => {
    setHasAttemptedSubmit(true);
    const nextErrors = validatePostRideForm(state);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const payload = buildPostRideSubmitPayload(state);
    onSubmit(payload);
    handleClose();
  };

  const showManualEntry = state.allowManualOrigin || state.locationPermission === 'denied';
  const canUseGps = state.locationPermission === 'granted';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Post a Ride</Text>
            <TouchableOpacity onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.linkText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Origin</Text>
            {canUseGps && !showManualEntry ? (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapText}>Map preview placeholder</Text>
                <Text style={styles.mapSubText}>Using current GPS location</Text>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  value={state.originLabel}
                  onChangeText={(text) => dispatch({ type: 'setOriginLabel', payload: text })}
                  placeholder={showManualEntry ? 'Enter pickup location' : 'Origin label'}
                  accessibilityLabel="Origin input"
                />
                <Text style={styles.helperText}>Location saved as approximate.</Text>
              </View>
            )}
            {state.locationPermission === 'denied' && (
              <Text style={styles.warningText}>
                Location permission denied. Please enter your pickup location manually so riders have context.
              </Text>
            )}
            {canUseGps && (
              <TouchableOpacity
                onPress={() => handleManualOriginToggle(!showManualEntry)}
                accessibilityRole="button"
                style={styles.inlineAction}
              >
                <Text style={styles.linkText}>
                  {showManualEntry ? 'Use current GPS instead' : 'Enter location manually'}
                </Text>
              </TouchableOpacity>
            )}
            {errors.origin && <Text style={styles.errorText}>{errors.origin}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Destination campus</Text>
            <View style={styles.optionRow}>
              {DESTINATION_OPTIONS.map((option) => {
                const isSelected = state.destinationCampus === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                    onPress={() => handleDestinationSelect(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.optionChipText, isSelected && styles.optionChipTextSelected]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.destinationCampus && <Text style={styles.errorText}>{errors.destinationCampus}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seats available</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                onPress={() => adjustSeats(-1)}
                style={[styles.stepperButton, state.seats <= 1 && styles.stepperButtonDisabled]}
                accessibilityRole="button"
                disabled={state.seats <= 1}
              >
                <Text style={styles.stepperLabel}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{state.seats}</Text>
              <TouchableOpacity
                onPress={() => adjustSeats(1)}
                style={[styles.stepperButton, state.seats >= 5 && styles.stepperButtonDisabled]}
                accessibilityRole="button"
                disabled={state.seats >= 5}
              >
                <Text style={styles.stepperLabel}>+</Text>
              </TouchableOpacity>
            </View>
            {errors.seats && <Text style={styles.errorText}>{errors.seats}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Departure window</Text>
            <Text style={styles.helperText}>Let riders know your flexibility (minutes)</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                onPress={() => adjustWindowDuration(-5)}
                style={[styles.stepperButton, state.windowDurationMinutes <= 5 && styles.stepperButtonDisabled]}
                accessibilityRole="button"
                disabled={state.windowDurationMinutes <= 5}
              >
                <Text style={styles.stepperLabel}>-5</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{state.windowDurationMinutes}</Text>
              <TouchableOpacity
                onPress={() => adjustWindowDuration(5)}
                style={[styles.stepperButton, state.windowDurationMinutes >= 60 && styles.stepperButtonDisabled]}
                accessibilityRole="button"
                disabled={state.windowDurationMinutes >= 60}
              >
                <Text style={styles.stepperLabel}>+5</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.stepperRow, styles.offsetRow]}>
              <TouchableOpacity
                onPress={() => adjustDepartureOffset(-5)}
                style={[styles.stepperButton, state.departureOffsetMinutes <= 0 && styles.stepperButtonDisabled]}
                accessibilityRole="button"
                disabled={state.departureOffsetMinutes <= 0}
              >
                <Text style={styles.stepperLabel}>-5</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{state.departureOffsetMinutes}</Text>
              <TouchableOpacity
                onPress={() => adjustDepartureOffset(5)}
                style={[styles.stepperButton, state.departureOffsetMinutes >= 120 && styles.stepperButtonDisabled]}
                accessibilityRole="button"
                disabled={state.departureOffsetMinutes >= 120}
              >
                <Text style={styles.stepperLabel}>+5</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Minutes until you leave</Text>
            {errors.window && <Text style={styles.errorText}>{errors.window}</Text>}
          </View>

  <TouchableOpacity
    style={[styles.submitButton, !isSubmitEnabled && styles.submitButtonDisabled]}
    accessibilityRole="button"
    accessibilityState={{ disabled: !isSubmitEnabled }}
    onPress={handleSubmit}
  >
            <Text style={styles.submitLabel}>Post Ride</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.25,
    shadowRadius: 6,
    elevation: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  linkText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600'
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  mapPlaceholder: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  mapText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8'
  },
  mapSubText: {
    fontSize: 12,
    color: '#1E3A8A',
    marginTop: 4
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF'
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6
  },
  warningText: {
    marginTop: 8,
    fontSize: 12,
    color: '#B45309'
  },
  inlineAction: {
    marginTop: 8
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#DC2626'
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  optionChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB'
  },
  optionChipText: {
    fontSize: 14,
    color: '#111827'
  },
  optionChipTextSelected: {
    color: '#FFFFFF'
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12
  },
  offsetRow: {
    marginTop: 8
  },
  stepperButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6'
  },
  stepperButtonDisabled: {
    opacity: 0.4
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: '600'
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '700'
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD'
  },
  submitLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  }
});

export default PostRideSheet;
