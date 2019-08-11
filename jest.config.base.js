module.exports = {
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testRegex: '(.*\\.(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/tsconfig.build.json'
    }
  },
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
  ],
  coveragePathIgnorePatterns: [
    '(tests/.*.mock).(jsx?|tsx?)$',
    '(index.ts)$',
  ],
  setupFiles: ['reflect-metadata'],
  setupFilesAfterEnv: ['jest-extended'],
  // verbose: true,
}
