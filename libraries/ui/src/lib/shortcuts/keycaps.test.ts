import { describe, it, expect } from 'vitest'

import { shortcutKeycaps } from './keycaps'

const labels = (keys: string, apple: boolean) => shortcutKeycaps(keys, apple).map((cap) => cap.label)

describe('shortcutKeycaps', () => {
  it('writes the primary modifier the way the platform does', () => {
    expect(labels('mod+comma', true)).toEqual(['⌘', ','])
    expect(labels('mod+comma', false)).toEqual(['Ctrl', ','])
  })

  it('keeps a literal control key distinct from mod on Apple keyboards', () => {
    expect(labels('ctrl+p', true)).toEqual(['⌃', 'P'])
    expect(labels('ctrl+p', false)).toEqual(['Ctrl', 'P'])
  })

  it('spells out the other modifiers per platform', () => {
    expect(labels('mod+alt+shift+p', true)).toEqual(['⌘', '⌥', '⇧', 'P'])
    expect(labels('mod+alt+shift+p', false)).toEqual(['Ctrl', 'Alt', 'Shift', 'P'])
  })

  it('turns punctuation key codes back into the character on the key', () => {
    expect(labels('slash', false)).toEqual(['/'])
    expect(labels('period', false)).toEqual(['.'])
    expect(labels('bracketleft', false)).toEqual(['['])
    expect(labels('equal', false)).toEqual(['='])
  })

  it('draws the arrow keys as arrows', () => {
    expect(labels('mod+arrowup', false)).toEqual(['Ctrl', '↑'])
    expect(labels('arrowleft', false)).toEqual(['←'])
  })

  it('names the keys that have no printable character', () => {
    expect(labels('space', false)).toEqual(['Space'])
    expect(labels('escape', false)).toEqual(['Esc'])
    expect(labels('enter', false)).toEqual(['Enter'])
  })

  it('capitalizes letters and leaves digits alone', () => {
    expect(labels('b', false)).toEqual(['B'])
    expect(labels('1', false)).toEqual(['1'])
  })

  it('marks which caps are modifiers so they can be styled apart', () => {
    expect(shortcutKeycaps('mod+shift+p', false)).toEqual([
      { token: 'mod', label: 'Ctrl', modifier: true },
      { token: 'shift', label: 'Shift', modifier: true },
      { token: 'p', label: 'P', modifier: false },
    ])
  })

  it('has nothing to draw for an empty binding', () => {
    expect(shortcutKeycaps('', false)).toEqual([])
  })

  // An unrecognised code still has to render as something rather than vanish
  it('falls back to the raw token', () => {
    expect(labels('f13', false)).toEqual(['F13'])
  })
})
