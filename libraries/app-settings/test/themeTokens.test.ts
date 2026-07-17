import { readFileSync } from 'fs'
import { join } from 'path'
import {
  test,
  expect,
} from '@jest/globals'

import { perThemeTokens } from '../src/themeTokens'

const THEME_CSS_DIR = join(__dirname, '../../ui/public/styles/themes')

/**
 * Every `--custom-property` declared anywhere in the given CSS file, top
 * level or nested (eg. inside `.glass`).
 */
const definedVars = (cssFileName: string): Set<string> => {
  const css = readFileSync(join(THEME_CSS_DIR, cssFileName), 'utf-8')
  const matches = [...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)]
  return new Set(matches.map((match) => match[1]))
}

test('Light.css defines exactly the manifest\'s per-theme variables', () => {
  const manifestVars = new Set(perThemeTokens.map((token) => token.varName))
  expect(definedVars('Light.css')).toEqual(manifestVars)
})

test('Dark.css defines exactly the manifest\'s per-theme variables', () => {
  const manifestVars = new Set(perThemeTokens.map((token) => token.varName))
  expect(definedVars('Dark.css')).toEqual(manifestVars)
})
