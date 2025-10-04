import { useMutation } from '@tanstack/react-query';

export const useCreateLiveRide = () =>
  useMutation({
    mutationKey: ['create-live-ride'],
    mutationFn: async (_payload: unknown) => {
      // TODO: Implement ride creation via Firestore/Cloud Functions
      throw new Error('createLiveRide not implemented');
    }
  });

export const useCreateScheduledRide = () =>
  useMutation({
    mutationKey: ['create-scheduled-ride'],
    mutationFn: async (_payload: unknown) => {
      // TODO: Implement scheduled ride creation with validation
      throw new Error('createScheduledRide not implemented');
    }
  });

export const useRideStatusMutations = () =>
  useMutation({
    mutationKey: ['update-ride-status'],
    mutationFn: async (_payload: unknown) => {
      // TODO: Allow drivers to mark rides started/completed and trigger incentives
      throw new Error('updateRideStatus not implemented');
    }
  });
