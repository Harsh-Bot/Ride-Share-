import { DefaultTheme, Theme } from '@react-navigation/native';

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#D4145A',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1F2933',
    border: '#E5E7EB',
    notification: '#D4145A'
  }
};
