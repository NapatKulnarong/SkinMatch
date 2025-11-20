import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './', 
});


const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '<rootDir>/__test__/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@mswjs|strict-event-emitter|headers-polyfill|until-async|is-node-process)/)',
  ],
};

export default createJestConfig(customJestConfig);
