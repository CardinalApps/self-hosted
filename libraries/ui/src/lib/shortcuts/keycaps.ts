import { isShortcutModifier, shortcutKeyTokens } from '@cardinalapps/app-settings/src/shortcuts'

export type Keycap = {
  token: string,
  label: string,
  modifier: boolean,
}

/*
 * Apple keyboards label the modifier keys with symbols, and their primary modifier is Command
 * rather than Control. `mod` is stored rather than either one, so which of the two a binding
 * asks for is only decided here and in the listener.
 */
const APPLE_MODIFIERS: Record<string, string> = {
  mod: '⌘',
  meta: '⌘',
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  shift: '⇧',
}

const MODIFIERS: Record<string, string> = {
  mod: 'Ctrl',
  meta: 'Win',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
}

// Key codes whose character is not what the code is called
const KEYS: Record<string, string> = {
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  backquote: '`',
  backslash: '\\',
  bracketleft: '[',
  bracketright: ']',
  comma: ',',
  equal: '=',
  minus: '-',
  period: '.',
  quote: '\'',
  semicolon: ';',
  slash: '/',
  escape: 'Esc',
  capslock: 'Caps',
  pageup: 'Page Up',
  pagedown: 'Page Down',
}

/**
 * Whether the primary modifier is Command rather than Control. Matches how `react-hotkeys-hook`
 * decides the same thing, so the keycaps on screen name the key that actually fires the shortcut.
 */
export const isApplePlatform = (): boolean => (
  typeof navigator !== 'undefined'
  && /mac/i.test(navigator.userAgent)
  && !/iphone|ipad|ipod/i.test(navigator.userAgent)
)

/**
 * Turns a stored binding into the keys to draw, in the order they are pressed.
 */
export const shortcutKeycaps = (keys: string, apple: boolean = isApplePlatform()): Keycap[] => (
  shortcutKeyTokens(keys).map((token) => {
    const modifier = isShortcutModifier(token)
    const modifierLabels = apple ? APPLE_MODIFIERS : MODIFIERS

    return {
      token,
      modifier,
      label: modifier
        ? modifierLabels[token] || token
        : KEYS[token] || (token.length === 1 ? token.toUpperCase() : token.replace(/^./, (first) => first.toUpperCase())),
    }
  })
)
