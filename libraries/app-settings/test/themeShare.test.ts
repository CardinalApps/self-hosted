import {
  test,
  expect,
} from '@jest/globals'

import { parseSharedTheme } from '../src/themeShare'

const validTheme = {
  name: 'Midnight Cardinal',
  base: 'dark',
  vars: {
    '--bg-1': '#1a1a2e',
    '--scrollbar-color': 'rgb(26, 26, 26)',
    '--glass-bg': 'rgba(255, 255, 255, 0.2)',
    '--gutter': '24px',
    '--font-family': "'Georgia', 'Times New Roman', serif",
  },
}

test('accepts a valid theme', () => {
  expect(parseSharedTheme(JSON.stringify(validTheme))).toEqual(validTheme)
})

test('accepts a theme without a name or with empty vars', () => {
  expect(parseSharedTheme(JSON.stringify({ base: 'light', vars: {} }))).toEqual({ base: 'light', vars: {} })
})

test('rejects input that is not a JSON object', () => {
  expect(parseSharedTheme('not json at all')).toBeNull()
  expect(parseSharedTheme('"a string"')).toBeNull()
  expect(parseSharedTheme('[1, 2]')).toBeNull()
  expect(parseSharedTheme('null')).toBeNull()
})

test('rejects a missing or unknown base theme', () => {
  expect(parseSharedTheme(JSON.stringify({ vars: {} }))).toBeNull()
  expect(parseSharedTheme(JSON.stringify({ base: 'midnight', vars: {} }))).toBeNull()
})

test('rejects missing or malformed vars', () => {
  expect(parseSharedTheme(JSON.stringify({ base: 'dark' }))).toBeNull()
  expect(parseSharedTheme(JSON.stringify({ base: 'dark', vars: ['--bg-1'] }))).toBeNull()
})

test('rejects vars that are not exposed manifest tokens', () => {
  expect(parseSharedTheme(JSON.stringify({ base: 'dark', vars: { '--not-a-token': '#fff' } }))).toBeNull()
  // In the manifest, but not exposed to the editor
  expect(parseSharedTheme(JSON.stringify({ base: 'dark', vars: { '--box-shadow-1': '#fff' } }))).toBeNull()
})

test('rejects values that do not match the token type', () => {
  expect(parseSharedTheme(JSON.stringify({ base: 'dark', vars: { '--bg-1': 'url(https://evil.example)' } }))).toBeNull()
  expect(parseSharedTheme(JSON.stringify({ base: 'dark', vars: { '--bg-1': 'red; background: url(x)' } }))).toBeNull()
  expect(parseSharedTheme(JSON.stringify({ base: 'dark', vars: { '--gutter': '24' } }))).toBeNull()
  expect(parseSharedTheme(JSON.stringify({ base: 'dark', vars: { '--gutter': '24em' } }))).toBeNull()
  expect(parseSharedTheme(JSON.stringify({ base: 'dark', vars: { '--font-family': 'url(https://evil.example)' } }))).toBeNull()
  expect(parseSharedTheme(JSON.stringify({ base: 'dark', vars: { '--bg-1': 42 } }))).toBeNull()
})

test('strips the accent color instead of importing it', () => {
  const withAccent = { base: 'light', vars: { '--accent-color': '#7f5af0', '--bg-1': '#ffffff' } }
  expect(parseSharedTheme(JSON.stringify(withAccent))).toEqual({ base: 'light', vars: { '--bg-1': '#ffffff' } })
})

test('rejects a non-string name and caps an overlong one', () => {
  expect(parseSharedTheme(JSON.stringify({ name: 42, base: 'dark', vars: {} }))).toBeNull()

  const longName = 'x'.repeat(200)
  const parsed = parseSharedTheme(JSON.stringify({ name: longName, base: 'dark', vars: {} }))
  expect(parsed?.name).toHaveLength(60)
})
