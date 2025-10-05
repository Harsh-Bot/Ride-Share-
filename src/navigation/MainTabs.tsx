import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import DashboardScreen from '../screens/DashboardScreen';
import LiveRidesScreen from '../features/rides/screens/LiveRidesScreen';
import ScheduledRidesScreen from '../features/rides/screens/ScheduledRidesScreen';
import ChatListScreen from '../features/chat/screens/ChatListScreen';
import DriverConsoleScreen from '../features/rides/screens/DriverConsoleScreen';
import MyRidesScreen from '../features/rides/screens/MyRidesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="LiveRides" component={LiveRidesScreen} />
    <Tab.Screen name="MyRides" component={MyRidesScreen} />
    <Tab.Screen name="ScheduledRides" component={ScheduledRidesScreen} />
    <Tab.Screen name="DriverConsole" component={DriverConsoleScreen} />
    <Tab.Screen name="Chat" component={ChatListScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);
