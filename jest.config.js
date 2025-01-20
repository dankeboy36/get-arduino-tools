import slowJestConfig from './jest.config.slow.js'

const collectCoverageFrom = ['src/*.js']
slowJestConfig.testMatch?.forEach((glob) =>
  collectCoverageFrom.push(`!${glob}`)
)

/** @type {import('jest').Config} */
export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom,
  testMatch: ['**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testEnvironment: 'node',
}
