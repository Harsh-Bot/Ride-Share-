export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied'
}

export enum Accuracy {
  Balanced = 3
}

export const getForegroundPermissionsAsync = jest.fn(async () => ({ status: PermissionStatus.GRANTED }));
export const requestForegroundPermissionsAsync = jest.fn(async () => ({ status: PermissionStatus.GRANTED }));
export const getCurrentPositionAsync = jest.fn(async () => ({
  coords: {
    latitude: 49.2827,
    longitude: -123.1207,
    accuracy: 5
  },
  timestamp: Date.now()
}));

export default {
  PermissionStatus,
  Accuracy,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync
};
