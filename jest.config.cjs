/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests/jest', '<rootDir>/functions/tests'],
  testMatch: ['**/__tests__/**/*.test.[tj]s', '**/?(*.)+(spec|test).[tj]s'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/tests/setup/env.js', '<rootDir>/tests/setup/jestSetup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: './tsconfig.json' }]
  },
  moduleNameMapper: {
    '\\.(svg|png|jpg|jpeg)$': '<rootDir>/tests/mocks/fileMock.ts'
  },
  resetMocks: true,
  clearMocks: true
};

module.exports = config;
