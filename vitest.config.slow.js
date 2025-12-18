// @ts-check

import { defineConfig } from 'vitest/config'

import baseConfig from './vitest.config.js'

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['src/**/*.slow-test.js'],
    exclude: ['src/**/*.test.js'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    maxConcurrency: 1, // Do not stress-test Arduino's resources
  },
})
