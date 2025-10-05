module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.pre.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.expo/', '/playwright/', '/tests/'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(|-.*)|@expo(|-.*)|@unimodules|@react-native-community|@react-native-picker|@sentry|@tanstack|firebase(|-.*)|@firebase(|-.*))'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/features/auth/screens/SignInScreen.tsx',
    'src/features/rides/screens/HomeScreen.tsx',
    'src/store/useProfileStore.ts',
    'src/services/api/**/*.ts',
    'src/navigation/MainTabs.tsx'
  ],
  moduleNameMapper: {
    '^expo-modules-core/(.*)$': '<rootDir>/node_modules/expo-modules-core/src/$1'
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
