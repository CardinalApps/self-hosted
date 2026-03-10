import js from '@eslint/js'
import turboPlugin from 'eslint-plugin-turbo'
import tseslint from 'typescript-eslint'
import onlyWarn from 'eslint-plugin-only-warn'
import stylistic from '@stylistic/eslint-plugin'

/**
 * Shared ESLint configuration for the monorepo.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    plugins: {
      '@stylistic': stylistic,
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
    ],
    ignores: ['dist/**', 'build/**', '**/*.json'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { caughtErrors: 'none' }],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@stylistic/semi': ['warn', 'never'],
      '@stylistic/no-tabs': ['warn'],
      '@stylistic/no-trailing-spaces': ['warn', { 'skipBlankLines': false, 'ignoreComments': true }],
      '@stylistic/comma-dangle': ['warn', 'always-multiline'],
      '@stylistic/comma-spacing': ['warn', { 'before': false, 'after': true }],
      '@stylistic/arrow-parens': ['warn', 'always'],
      '@stylistic/arrow-spacing': ['warn', { 'before': true, 'after': true }],
      '@stylistic/array-bracket-spacing': ['warn', 'never'],
      '@stylistic/array-element-newline': ['warn', 'consistent'],
      '@stylistic/dot-location': ['warn', 'property'],
      '@stylistic/object-curly-spacing': ['warn', 'always'],
    },
  },
];
