import * as Linking from 'expo-linking';
import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

const prefix = Linking.createURL('/');

export const linkingConfig: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'https://sfurideshare.page.link'],
  config: {
    screens: {
      Auth: {
        screens: {
          Welcome: 'welcome',
          SignIn: 'auth/sign-in',
          VerifyEmail: 'auth/verify'
        }
      },
      MainTabs: {
        screens: {
          Dashboard: 'dashboard',
          LiveRides: 'rides/live',
          ScheduledRides: 'rides/scheduled',
          Chat: 'chat',
          Profile: 'profile'
        }
      },
      RideDetails: 'rides/live/:rideId',
      ScheduledRideDetails: 'rides/scheduled/:scheduledRideId'
    }
  }
};
