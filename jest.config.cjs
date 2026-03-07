/** @type {import('jest').Config} */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],

  setupFiles: ['<rootDir>/tests/setup/test-env.js'],

  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },

  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/tests/setup/prisma-client-mock.ts',
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: '<rootDir>/',
    }),
  },
};
