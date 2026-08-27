module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main/**/*',
    '!src/**/index.{ts,tsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/renderer/$1',
    '^@/shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@/components/(.*)$': '<rootDir>/src/renderer/components/$1',
    '^@/pages/(.*)$': '<rootDir>/src/renderer/pages/$1',
    '^@/utils/(.*)$': '<rootDir>/src/renderer/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/renderer/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/src/shared/types/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverage: false,
  verbose: true,
};
