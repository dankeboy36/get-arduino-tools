// @ts-check

import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'
import vitestPlugin from '@vitest/eslint-plugin'
import neostandard from 'neostandard'

const baseRules = neostandard({
  semi: false,
  ts: true,
  ignores: ['dist', 'node_modules', 'coverage'],
})

export default defineConfig([
  ...baseRules,
  {
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      'vitest/no-conditional-expect': 'off',
      'vitest/no-identical-title': 'off',
      'vitest/no-standalone-expect': 'off',
    },
    languageOptions: {
      globals: {
        ...vitestPlugin.environments.env.globals,
      },
    },
  },
  {
    rules: {
      curly: 'warn',
      eqeqeq: 'warn',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/generator-star-spacing': 'off',
      '@stylistic/indent': 'off',
      '@stylistic/no-tabs': 'off',
      '@stylistic/space-before-function-paren': [
        'error',
        { anonymous: 'always', named: 'never', asyncArrow: 'always' },
      ],
      'generator-star-spacing': 'off',
      '@stylistic/jsx-quotes': ['error', 'prefer-double'],
      'import-x/first': 'error',
      'import-x/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
        },
      ],
      'import-x/newline-after-import': 'error',
    },
  },
  // Disable ESLint rules that conflict with Prettier.
  eslintConfigPrettier,
])
