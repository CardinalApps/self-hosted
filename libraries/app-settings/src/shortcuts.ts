import { SupportedLang } from './types'
import i18n from './i18n'

/**
 * Keyboard shortcuts are stored in the notation used by `react-hotkeys-hook`, which is what
 * listens for them in the apps: lowercase `+` separated tokens, eg. `mod+shift+p`. `mod` is the
 * platform's primary modifier - Command on macOS, Control everywhere else - so one stored binding
 * follows the user's account onto whichever machine they sign in from.
 *
 * Non-modifier tokens are `KeyboardEvent.code` values with their `Key`/`Digit`/`Numpad` prefix
 * stripped and lowercased, so the comma key is `comma` and the digit 1 is `1`. That is the same
 * normalization the library applies to incoming events, which is what lets a stored string be
 * compared to a keypress at all.
 */
export type ShortcutBinding = {
  keys: string,
  action: string,
}

export type ShortcutActionDefinition = {
  id: string,
  label: string,
}

/**
 * A named collection of bindings. One built-in set ships with the app; everything else is the
 * user's, and is stored alongside their custom themes.
 */
export type ShortcutSet = {
  id: string,
  name: string,
  bindings: ShortcutBinding[],
}

// The set that ships with the app. It is never stored, so it is always there to go back to.
export const DEFAULT_SHORTCUT_SET = 'default'

// Actions are dispatched as plain Redux actions under this prefix, the way server-sent events use `sse/`
export const SHORTCUT_ACTION_PREFIX = 'shortcut/'

// Tokens that only qualify a keypress. Everything else is the key being pressed.
const MODIFIERS = ['mod', 'ctrl', 'control', 'meta', 'alt', 'shift']

/*
 * The order modifiers are written in. Only cosmetic - the listener compares modifiers as flags,
 * not as text - but it keeps stored values and the keycaps on screen in one predictable order.
 */
const MODIFIER_ORDER = ['mod', 'ctrl', 'control', 'meta', 'alt', 'shift']

/*
 * Every action a shortcut can be bound to, in the order the settings page offers them. Every app
 * offers all of them: a set follows the account into each Cardinal app, and one bound to
 * something the app at hand has no use for simply does nothing there.
 */
const actionDefinitions = (lang: SupportedLang): ShortcutActionDefinition[] => [
  {
    id: `${SHORTCUT_ACTION_PREFIX}open-settings`,
    label: i18n['settings.shortcuts.action.open-settings'][lang],
  },
  {
    id: `${SHORTCUT_ACTION_PREFIX}toggle-nav-sidebar`,
    label: i18n['settings.shortcuts.action.toggle-nav-sidebar'][lang],
  },
  {
    id: `${SHORTCUT_ACTION_PREFIX}toggle-playback-sidebar`,
    label: i18n['settings.shortcuts.action.toggle-playback-sidebar'][lang],
  },
  {
    id: `${SHORTCUT_ACTION_PREFIX}play-pause`,
    label: i18n['settings.shortcuts.action.play-pause'][lang],
  },
  {
    id: `${SHORTCUT_ACTION_PREFIX}previous-track`,
    label: i18n['settings.shortcuts.action.previous-track'][lang],
  },
  {
    id: `${SHORTCUT_ACTION_PREFIX}next-track`,
    label: i18n['settings.shortcuts.action.next-track'][lang],
  },
  {
    id: `${SHORTCUT_ACTION_PREFIX}mute`,
    label: i18n['settings.shortcuts.action.mute'][lang],
  },
  {
    id: `${SHORTCUT_ACTION_PREFIX}volume-up`,
    label: i18n['settings.shortcuts.action.volume-up'][lang],
  },
  {
    id: `${SHORTCUT_ACTION_PREFIX}volume-down`,
    label: i18n['settings.shortcuts.action.volume-down'][lang],
  },
]

/**
 * Every action a shortcut can be bound to.
 */
export const allShortcutActions = (lang: SupportedLang = 'en'): ShortcutActionDefinition[] => (
  actionDefinitions(lang)
)

export const getShortcutAction = (
  id: string,
  lang: SupportedLang = 'en',
): ShortcutActionDefinition | undefined => (
  actionDefinitions(lang).find((action) => action.id === id)
)

export const isKnownShortcutAction = (id: string): boolean => !!getShortcutAction(id)

/**
 * Splits a stored binding into its lowercase tokens.
 */
export const shortcutKeyTokens = (keys: string): string[] => {
  if (typeof keys !== 'string') {
    return []
  }

  return keys
    .toLowerCase()
    .split('+')
    .map((token) => token.trim())
    .filter((token) => !!token.length)
}

export const isShortcutModifier = (token: string): boolean => MODIFIERS.includes(token)

/**
 * Rewrites a combination into the one spelling it is stored and displayed as. Returns an empty
 * string for anything that is only modifiers, since a shortcut with no key of its own can never
 * fire and must not be saved.
 */
export const normalizeShortcutKeys = (keys: string | string[]): string => {
  const tokens = Array.isArray(keys)
    ? keys.map((token) => String(token).toLowerCase().trim()).filter((token) => !!token.length)
    : shortcutKeyTokens(keys)

  const key = tokens.find((token) => !isShortcutModifier(token))

  if (!key) {
    return ''
  }

  const modifiers = MODIFIER_ORDER.filter((modifier) => tokens.includes(modifier))

  return [...modifiers, key].join('+')
}

/**
 * The combination that is actually listened for, once the "single-key shortcuts" preference has
 * been applied. It drops `mod` from combinations that carry no other modifier, so `mod+slash`
 * becomes `slash` while `mod+shift+p` still asks for both.
 */
export const resolveShortcutKeys = (keys: string, singleKeyMode: boolean): string => {
  if (!singleKeyMode) {
    return keys
  }

  const tokens = shortcutKeyTokens(keys)
  const modifiers = tokens.filter((token) => isShortcutModifier(token))

  if (modifiers.length !== 1 || modifiers[0] !== 'mod') {
    return keys
  }

  return normalizeShortcutKeys(tokens.filter((token) => token !== 'mod'))
}

/**
 * Narrows a stored `keyboard_shortcuts` value to a usable list.
 *
 * The setting is user-scoped, so its value arrives over the network and can be anything. Entries
 * that could never fire are dropped, but an entry naming an action this build has never heard of
 * is kept: it was written by a newer app, and the editor saves the whole list back.
 */
export const asShortcutBindings = (value: unknown): ShortcutBinding[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<ShortcutBinding[]>((bindings, entry) => {
    const keys = normalizeShortcutKeys(entry?.keys)
    const action = entry?.action

    if (keys && typeof action === 'string' && action.length) {
      bindings.push({ keys, action })
    }

    return bindings
  }, [])
}

/**
 * The keys that more than one binding in the set listens for. Compared after the single-key
 * preference is applied, because that is where the collision would happen.
 */
export const shortcutConflicts = (
  bindings: ShortcutBinding[],
  singleKeyMode: boolean,
): Set<string> => {
  const seen = new Set<string>()
  const conflicts = new Set<string>()

  bindings.forEach((binding) => {
    const keys = resolveShortcutKeys(binding.keys, singleKeyMode)

    if (seen.has(keys)) {
      conflicts.add(keys)
    }

    seen.add(keys)
  })

  return conflicts
}

/**
 * The built-in `Default` set. Editing it forks a copy, so these are always here to come back to.
 */
export const defaultShortcuts: ShortcutBinding[] = [
  { keys: 'mod+comma', action: `${SHORTCUT_ACTION_PREFIX}open-settings` },
  { keys: 'mod+b', action: `${SHORTCUT_ACTION_PREFIX}toggle-nav-sidebar` },
  { keys: 'mod+slash', action: `${SHORTCUT_ACTION_PREFIX}toggle-playback-sidebar` },
  { keys: 'mod+p', action: `${SHORTCUT_ACTION_PREFIX}play-pause` },
  { keys: 'mod+arrowleft', action: `${SHORTCUT_ACTION_PREFIX}previous-track` },
  { keys: 'mod+arrowright', action: `${SHORTCUT_ACTION_PREFIX}next-track` },
  { keys: 'mod+shift+m', action: `${SHORTCUT_ACTION_PREFIX}mute` },
  { keys: 'mod+arrowup', action: `${SHORTCUT_ACTION_PREFIX}volume-up` },
  { keys: 'mod+arrowdown', action: `${SHORTCUT_ACTION_PREFIX}volume-down` },
]

/**
 * Narrows a stored `custom_shortcut_sets` value to a usable list. Sets arrive over the network,
 * so anything without an identity to select it by is dropped rather than trusted.
 */
export const asShortcutSets = (value: unknown): ShortcutSet[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((set) => !!set?.id)
    .map((set) => ({
      id: String(set.id),
      name: String(set.name || ''),
      bindings: asShortcutBindings(set.bindings),
    }))
}

/**
 * The bindings that are actually listened for, given the selected set.
 *
 * The selection outlives whatever wrote it - a set deleted on another device, a value from an
 * older build - so anything unrecognised falls back to the built-in set rather than leaving the
 * user with no shortcuts at all. An empty custom set is a choice, and is left empty.
 */
export const resolveShortcutBindings = (selected: unknown, customSets: ShortcutSet[]): ShortcutBinding[] => {
  const chosen = customSets.find((set) => `custom:${set.id}` === selected)

  return chosen ? chosen.bindings : defaultShortcuts
}
