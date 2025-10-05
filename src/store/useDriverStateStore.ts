import { create } from 'zustand';

type DriverState = {
  hasActiveTrip: boolean;
  driverId: string;
  setHasActiveTrip: (value: boolean) => void;
  setDriverId: (driverId: string) => void;
};

export const useDriverStateStore = create<DriverState>((set) => ({
  hasActiveTrip: false,
  driverId: 'driver-demo',
  setHasActiveTrip: (value) => set({ hasActiveTrip: value }),
  setDriverId: (driverId) => set({ driverId })
}));
