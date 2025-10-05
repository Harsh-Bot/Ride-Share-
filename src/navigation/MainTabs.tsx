import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import HomeScreen from '../features/rides/screens/HomeScreen';
import LiveRidesScreen from '../features/rides/screens/LiveRidesScreen';
import ScheduledRidesScreen from '../features/rides/screens/ScheduledRidesScreen';
import ChatListScreen from '../features/chat/screens/ChatListScreen';
import DriverConsoleScreen from '../features/rides/screens/DriverConsoleScreen';
import MyRidesScreen from '../features/rides/screens/MyRidesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TAB_ICONS = {
  Home: 'home',
  LiveRides: 'directions-car',
  ScheduledRides: 'query-builder',
  Chat: 'chat',
  Profile: 'account-box'
} as const;

export const MainTabs = () => (
  <Tab.Navigator initialRouteName="Home">
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS.Home} color={color} size={size} />
        ),
        tabBarTestID: 'tab-home'
      }}
    />
    <Tab.Screen
      name="LiveRides"
      component={LiveRidesScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS.LiveRides} color={color} size={size} />
        ),
        tabBarTestID: 'tab-live'
      }}
    />
    <Tab.Screen
      name="ScheduledRides"
      component={ScheduledRidesScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS.ScheduledRides} color={color} size={size} />
        ),
        tabBarTestID: 'tab-scheduled'
      }}
    />
    <Tab.Screen
      name="Chat"
      component={ChatListScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS.Chat} color={color} size={size} />
        ),
        tabBarTestID: 'tab-chat'
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS.Profile} color={color} size={size} />
        ),
        tabBarTestID: 'tab-profile'
      }}
    />
  </Tab.Navigator>
);
