import tseslint from 'typescript-eslint'

/** @type {import("eslint").Linter.Config} */
import { config as baseConfig } from '@cardinalapps/eslint-config/base'

export default tseslint.config(
  baseConfig,
  {
    ignores: ['**/dist/**'],
  },
)
