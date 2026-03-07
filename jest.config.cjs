/** @type {import('jest').Config} */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

const tsPaths = pathsToModuleNameMapper(compilerOptions.paths || {}, {
  prefix: '<rootDir>/',
});

const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/setup/test-env.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
};

module.exports = {
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      roots: ['<rootDir>/tests'],
      testPathIgnorePatterns: ['<rootDir>/tests/integration'],
      moduleNameMapper: {
        '^@prisma/client$': '<rootDir>/tests/setup/prisma-client-mock.ts',
        ...tsPaths,
      },
    },

    {
      ...baseConfig,
      displayName: 'integration',
      testTimeout: 60000,
      testMatch: ['<rootDir>/tests/integration/**/*.spec.ts'],
      moduleNameMapper: {
        ...tsPaths,
      },
    },
  ],
};
