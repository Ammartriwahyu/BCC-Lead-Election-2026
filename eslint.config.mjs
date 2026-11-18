import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '.lighthouseci/**',
    'next-env.d.ts',
    'public/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'react/no-danger': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
    },
  },
  {
    // Components must not talk HTTP directly: UI -> features hooks -> lib/api.
    files: ['src/components/**', 'src/app/**/*.tsx', 'src/features/**/components/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use a hook from src/features/* which calls src/lib/api.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='localStorage'], MemberExpression[object.name='sessionStorage']",
          message: 'Voter data must not be stored in web storage (booth mode).',
        },
      ],
    },
  },
  {
    // lib/api boundary: the app uses endpoints.ts (calls), types.ts and errors.ts only. Swapping the
    // backend then touches lib/api and mocks, nothing else (docs/INTEGRATION.md).
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/lib/api/**',
      'src/lib/bff/**',
      'src/mocks/**',
      'src/test/**',
      'src/**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // zodConfig: side-effect import (jitless Zod) for form schemas.
              regex: '^@/lib/api/(?!(endpoints|types|errors|zodConfig)$)',
              message:
                'Import from @/lib/api/endpoints, types or errors. Wire format and HTTP stay inside lib/api.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{mjs,js}', 'scripts/**', '*.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { 'no-console': 'off' },
  },
  prettier,
]);
