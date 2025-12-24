/** @type {import('jest').Config} */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // E2E/security tests can be slower on cold start (ts-jest transpile, dynamic imports).
  // Default Jest timeout (5s) is too aggressive for this boilerplate.
  testTimeout: 15000,
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],

  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/',
  }),
};
