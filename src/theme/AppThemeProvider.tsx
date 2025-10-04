import { ReactNode, createContext, useContext } from 'react';

type ThemeContextValue = {
  colorMode: 'light' | 'dark';
  toggleColorMode: () => void;
};

const defaultValue: ThemeContextValue = {
  colorMode: 'light',
  toggleColorMode: () => {
    // TODO: Implement theme switching logic
  }
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  // TODO: Wire up persistent theme state and OS color scheme sync
  return <ThemeContext.Provider value={defaultValue}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);
