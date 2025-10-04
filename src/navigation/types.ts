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

export type MainTabParamList = {
  Dashboard: undefined;
  LiveRides: undefined;
  ScheduledRides: undefined;
  Chat: undefined;
  Profile: undefined;
};
