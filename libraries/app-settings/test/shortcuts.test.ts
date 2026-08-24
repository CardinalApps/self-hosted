import {
  test,
  expect,
} from '@jest/globals'

import {
  asShortcutBindings,
  asShortcutSets,
  allShortcutActions,
  DEFAULT_SHORTCUT_SET,
  defaultShortcuts,
  isKnownShortcutAction,
  normalizeShortcutKeys,
  resolveShortcutBindings,
  resolveShortcutKeys,
  shortcutConflicts,
  shortcutKeyTokens,
} from '../src/shortcuts'

test('splits a stored shortcut into its lowercase tokens', () => {
  expect(shortcutKeyTokens('mod+comma')).toEqual(['mod', 'comma'])
  expect(shortcutKeyTokens('Mod + Shift + P')).toEqual(['mod', 'shift', 'p'])
  expect(shortcutKeyTokens('')).toEqual([])
  expect(shortcutKeyTokens('mod++p')).toEqual(['mod', 'p'])
})

test('normalizes tokens into a canonical modifier order', () => {
  expect(normalizeShortcutKeys(['p', 'shift', 'mod'])).toBe('mod+shift+p')
  expect(normalizeShortcutKeys(['shift', 'alt', 'ctrl', 'arrowright'])).toBe('ctrl+alt+shift+arrowright')
  expect(normalizeShortcutKeys('comma+mod')).toBe('mod+comma')
})

test('normalizing rejects a combination with no key of its own', () => {
  expect(normalizeShortcutKeys(['mod', 'shift'])).toBe('')
  expect(normalizeShortcutKeys([])).toBe('')
})

test('normalizing keeps only the first non-modifier key', () => {
  expect(normalizeShortcutKeys(['mod', 'p', 'q'])).toBe('mod+p')
})

test('single-key mode drops a lone mod but leaves other modifiers alone', () => {
  expect(resolveShortcutKeys('mod+slash', true)).toBe('slash')
  expect(resolveShortcutKeys('mod+shift+p', true)).toBe('mod+shift+p')
  expect(resolveShortcutKeys('mod+ctrl+p', true)).toBe('mod+ctrl+p')
  expect(resolveShortcutKeys('shift+slash', true)).toBe('shift+slash')
  expect(resolveShortcutKeys('slash', true)).toBe('slash')
})

test('single-key mode off leaves every combination untouched', () => {
  expect(resolveShortcutKeys('mod+slash', false)).toBe('mod+slash')
  expect(resolveShortcutKeys('mod+shift+p', false)).toBe('mod+shift+p')
})

test('reads a stored value into a usable list of bindings', () => {
  const stored = [
    { keys: 'mod+comma', action: 'shortcut/open-settings' },
    { keys: 'mod+slash', action: 'shortcut/toggle-playback-sidebar' },
  ]

  expect(asShortcutBindings(stored)).toEqual(stored)
})

test('degrades a malformed stored value to an empty list', () => {
  expect(asShortcutBindings(undefined)).toEqual([])
  expect(asShortcutBindings(null)).toEqual([])
  expect(asShortcutBindings('mod+comma')).toEqual([])
  expect(asShortcutBindings({ keys: 'mod+comma' })).toEqual([])
})

test('drops stored entries that are not a keys and action pair', () => {
  expect(asShortcutBindings([
    { keys: 'mod+comma', action: 'shortcut/open-settings' },
    { keys: '', action: 'shortcut/mute' },
    { keys: 'mod+p' },
    { action: 'shortcut/mute' },
    null,
    'mod+m',
  ])).toEqual([
    { keys: 'mod+comma', action: 'shortcut/open-settings' },
  ])
})

/*
 * A binding written by a newer build names an action this one has never heard of. It cannot be
 * rendered or fired here, but the editor saves the whole set back, so dropping it at read time
 * would delete the user's binding the moment they opened settings in an older app.
 */
test('keeps a well-formed binding for an action this build does not know', () => {
  const stored = [{ keys: 'mod+k', action: 'shortcut/from-the-future' }]

  expect(asShortcutBindings(stored)).toEqual(stored)
  expect(isKnownShortcutAction('shortcut/from-the-future')).toBe(false)
  expect(isKnownShortcutAction('shortcut/open-settings')).toBe(true)
})

test('normalizes the keys of stored bindings', () => {
  expect(asShortcutBindings([{ keys: 'Comma + Mod', action: 'shortcut/open-settings' }])).toEqual([
    { keys: 'mod+comma', action: 'shortcut/open-settings' },
  ])
})

/*
 * Every app offers every action. One bound to something the current app has no use for simply
 * does nothing there, which is what lets one set follow the account across all of them.
 */
test('offers the same actions whichever app is asking', () => {
  const ids = allShortcutActions().map((action) => action.id)

  expect(ids).toContain('shortcut/open-settings')
  expect(ids).toContain('shortcut/toggle-playback-sidebar')
  expect(ids).toContain('shortcut/play-pause')
})

test('every action carries a label and every default binding names a known action', () => {
  allShortcutActions().forEach((action) => {
    expect(typeof action.label).toBe('string')
    expect(action.label.length).toBeGreaterThan(0)
  })

  defaultShortcuts.forEach((binding) => {
    expect(isKnownShortcutAction(binding.action)).toBe(true)
    expect(normalizeShortcutKeys(binding.keys)).toBe(binding.keys)
  })
})

test('the defaults include the two shortcuts every app starts with', () => {
  expect(defaultShortcuts).toContainEqual({ keys: 'mod+comma', action: 'shortcut/open-settings' })
  expect(defaultShortcuts).toContainEqual({ keys: 'mod+slash', action: 'shortcut/toggle-playback-sidebar' })
})

test('reports keys claimed by more than one action', () => {
  const bindings = [
    { keys: 'mod+comma', action: 'shortcut/open-settings' },
    { keys: 'mod+comma', action: 'shortcut/mute' },
    { keys: 'mod+p', action: 'shortcut/play-pause' },
  ]

  expect([...shortcutConflicts(bindings, false)]).toEqual(['mod+comma'])
})

/*
 * Two bindings that are distinct with a modifier can collide once single-key mode strips it, so
 * conflicts are found against the keys that will actually be listened for.
 */
test('reports conflicts that only single-key mode creates', () => {
  const bindings = [
    { keys: 'mod+slash', action: 'shortcut/toggle-playback-sidebar' },
    { keys: 'slash', action: 'shortcut/mute' },
  ]

  expect([...shortcutConflicts(bindings, false)]).toEqual([])
  expect([...shortcutConflicts(bindings, true)]).toEqual(['slash'])
})

const customSet = (id: string, name: string, bindings = [{ keys: 'mod+k', action: 'shortcut/mute' }]) => ({
  id,
  name,
  bindings,
})

test('reads stored custom sets into a usable list', () => {
  const stored = [customSet('abc', 'Mine')]

  expect(asShortcutSets(stored)).toEqual(stored)
})

test('degrades malformed custom sets to an empty list', () => {
  expect(asShortcutSets(undefined)).toEqual([])
  expect(asShortcutSets('Mine')).toEqual([])
  expect(asShortcutSets([{ name: 'No id' }])).toEqual([])
})

test('normalizes the bindings inside a stored custom set', () => {
  expect(asShortcutSets([customSet('abc', 'Mine', [
    { keys: 'Comma + Mod', action: 'shortcut/open-settings' },
    { keys: '', action: 'shortcut/mute' },
  ])])).toEqual([
    customSet('abc', 'Mine', [{ keys: 'mod+comma', action: 'shortcut/open-settings' }]),
  ])
})

test('the built-in set is the shipped defaults', () => {
  expect(resolveShortcutBindings(DEFAULT_SHORTCUT_SET, [])).toEqual(defaultShortcuts)
})

test('a selected custom set supplies its own bindings', () => {
  const sets = [customSet('abc', 'Mine')]

  expect(resolveShortcutBindings('custom:abc', sets)).toEqual(sets[0].bindings)
})

/*
 * The selection outlives whatever wrote it - a set deleted on another device, or a value from a
 * build that named its sets differently - so anything unrecognised falls back to the defaults
 * rather than leaving the user with no shortcuts at all.
 */
test('an unrecognised selection falls back to the defaults', () => {
  expect(resolveShortcutBindings('custom:gone', [])).toEqual(defaultShortcuts)
  expect(resolveShortcutBindings(undefined, [])).toEqual(defaultShortcuts)
  expect(resolveShortcutBindings(['mod+comma'], [])).toEqual(defaultShortcuts)
})

// Emptying a custom set is a real choice, and must not read as "fall back to the defaults"
test('a custom set that the user emptied stays empty', () => {
  const sets = [customSet('abc', 'Mine', [])]

  expect(resolveShortcutBindings('custom:abc', sets)).toEqual([])
})
