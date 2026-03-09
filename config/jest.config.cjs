/** @type {import('jest').Config} */
const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../tsconfig.json');

const tsPaths = pathsToModuleNameMapper(compilerOptions.paths || {}, {
  prefix: '<rootDir>/',
});

const baseConfig = {
  rootDir: path.resolve(__dirname, '..'),
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/test-env.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: true }],
  },
};

module.exports = {
  testTimeout: 30000,
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
      testMatch: ['<rootDir>/tests/integration/**/*.spec.ts'],
      moduleNameMapper: {
        ...tsPaths,
      },
    },
  ],
};
