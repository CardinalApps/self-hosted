import { readFileSync } from 'fs'
import { join } from 'path'
import {
  test,
  expect,
} from '@jest/globals'

import { perThemeTokens, crossThemeTokens } from '../src/themeTokens'

const STYLES_DIR = join(__dirname, '../../ui/public/styles')

/**
 * Every `--custom-property` declared anywhere in the given CSS file, top
 * level or nested (eg. inside `.glass`).
 */
const definedVars = (cssFilePath: string): Set<string> => {
  const css = readFileSync(join(STYLES_DIR, cssFilePath), 'utf-8')
  const matches = [...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)]
  return new Set(matches.map((match) => match[1]))
}

test('Light.css defines exactly the manifest\'s per-theme variables', () => {
  const manifestVars = new Set(perThemeTokens.map((token) => token.varName))
  expect(definedVars('themes/Light.css')).toEqual(manifestVars)
})

test('Dark.css defines exactly the manifest\'s per-theme variables', () => {
  const manifestVars = new Set(perThemeTokens.map((token) => token.varName))
  expect(definedVars('themes/Dark.css')).toEqual(manifestVars)
})

test('themes.css defines exactly the manifest\'s cross-theme variables', () => {
  const manifestVars = new Set(crossThemeTokens.map((token) => token.varName))
  expect(definedVars('themes.css')).toEqual(manifestVars)
})
