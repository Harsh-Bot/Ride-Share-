import { Alert, Platform, ToastAndroid } from 'react-native';

type ToastType = 'success' | 'error';

const fallbackLog = (message: string, type: ToastType) => {
  const prefix = type === 'error' ? '[error]' : '[info]';
  console.log(`${prefix} ${message}`);
};

export const showToast = (message: string, type: ToastType = 'success') => {
  try {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }

    if (Platform.OS === 'web') {
      fallbackLog(message, type);
      return;
    }

    const title = type === 'error' ? 'Heads up' : 'Success';
    Alert.alert(title, message);
  } catch (error) {
    fallbackLog(message, type);
  }
};
