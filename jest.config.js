/** Unit tests for pure domain logic only (no React Native runtime). */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'node16',
          moduleResolution: 'node16',
          rootDir: './src',
          target: 'es2022',
          strict: true,
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
};
