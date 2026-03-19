/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    "^uuid$": "<rootDir>/src/__mocks__/uuid.ts",
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'es2022',
          module: 'commonjs',
        },
      },
    ],
  },
};