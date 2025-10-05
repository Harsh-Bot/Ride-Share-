export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  RideDetails: { rideId: string } | undefined;
  ScheduledRideDetails: { scheduledRideId: string } | undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  VerifyEmail: { email: string } | undefined;
};

export type RideTabParams = {
  role: 'driver' | 'rider';
  origin: string;
  destination: {
    id: 'burnaby' | 'surrey';
    label: string;
  };
};

export type MainTabParamList = {
  Dashboard: undefined;
  LiveRides: undefined;
  MyRides: undefined;
  ScheduledRides: undefined;
  DriverConsole: undefined;
  Chat: undefined;
  Profile: undefined;
};
