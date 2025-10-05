import { Alert, Platform, ToastAndroid } from 'react-native';

type ToastType = 'success' | 'error';

type ToastObserver = (message: string, type: ToastType) => void;

let toastObserver: ToastObserver | null = null;

const fallbackLog = (message: string, type: ToastType) => {
  const prefix = type === 'error' ? '[error]' : '[info]';
  console.log(`${prefix} ${message}`);
};

export const setToastObserver = (observer: ToastObserver | null) => {
  toastObserver = observer;
};

export const showToast = (message: string, type: ToastType = 'success') => {
  if (toastObserver) {
    try {
      toastObserver(message, type);
    } catch (error) {
      console.warn('Toast observer threw an error', error);
    }
  }

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
