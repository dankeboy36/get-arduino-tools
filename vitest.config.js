// @ts-check

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.js'],
    exclude: ['src/**/*.slow-test.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/**/*.slow-test.js'],
    },
  },
})
