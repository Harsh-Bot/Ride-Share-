import { test, expect } from '@playwright/test';
import { shouldShowDriverPostCta } from '../src/features/rides/utils/driverEligibility';
import {
  buildInitialPostRideFormState,
  postRideFormReducer,
  validatePostRideForm,
  canSubmitPostRideForm,
  type PostRideFormAction
} from '../src/features/rides/utils/postRideForm';

const applyActions = (actions: PostRideFormAction[]) =>
  actions.reduce(postRideFormReducer, buildInitialPostRideFormState());

test('post ride button visible only for eligible drivers', () => {
  expect(shouldShowDriverPostCta('driver', false)).toBe(true);
  expect(shouldShowDriverPostCta('driver', true)).toBe(false);
  expect(shouldShowDriverPostCta('rider', false)).toBe(false);
});

test('manual origin enabled when location permission denied', () => {
  const state = applyActions([
    { type: 'setLocationPermission', payload: 'denied' },
    { type: 'setAllowManualOrigin', payload: true },
    { type: 'setOriginPrecision', payload: 'approximate' }
  ]);

  expect(state.locationPermission).toBe('denied');
  expect(state.allowManualOrigin).toBe(true);
  expect(state.originPrecision).toBe('approximate');
});

test('validation errors returned for missing required fields', () => {
  const state = applyActions([
    { type: 'setLocationPermission', payload: 'denied' },
    { type: 'setAllowManualOrigin', payload: true },
    { type: 'setOriginLabel', payload: '' }
  ]);

  const errors = validatePostRideForm(state);
  expect(errors.origin).toBeDefined();
  expect(errors.destinationCampus).toBeDefined();
});

test('post ride form cannot submit until complete', () => {
  const incompleteState = buildInitialPostRideFormState();
  expect(canSubmitPostRideForm(incompleteState)).toBe(false);

  const partialState = applyActions([
    { type: 'setOriginLabel', payload: 'Cornerstone Bus Loop' },
    { type: 'setDestination', payload: 'Burnaby' }
  ]);
  expect(canSubmitPostRideForm(partialState)).toBe(true);
});
