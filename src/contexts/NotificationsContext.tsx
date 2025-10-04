import { createContext, ReactNode, useContext } from 'react';

type NotificationsContextValue = {
  requestPermissions: () => Promise<void>;
  registerForPushNotifications: () => Promise<void>;
  scheduleReminder: (options: { id: string; date: Date }) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const requestPermissions = async () => {
    // TODO: Implement Expo notifications permission handling
  };

  const registerForPushNotifications = async () => {
    // TODO: Implement device token registration
  };

  const scheduleReminder = async (_options: { id: string; date: Date }) => {
    // TODO: Implement reminder scheduling for upcoming rides
  };

  const value: NotificationsContextValue = {
    requestPermissions,
    registerForPushNotifications,
    scheduleReminder
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
