import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const custom = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default createJestConfig({
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
    },
    transformIgnorePatterns: [
      'node_modules/(?!(@mswjs/interceptors|msw|until-async|headers-polyfill|strict-event-emitter|is-node-process)/)',
    ],
  });