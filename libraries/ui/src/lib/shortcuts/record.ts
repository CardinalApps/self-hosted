import { normalizeShortcutKeys } from '@cardinalapps/app-settings/src/shortcuts'

/**
 * Turns the keys a recorder captured into the binding to store.
 *
 * Recording reports the modifier that was physically held - Command on a Mac, Control elsewhere -
 * but the primary modifier is stored as `mod` so one binding follows the account onto any
 * machine. A Mac user who deliberately held Control gets a Control binding, which is a different
 * shortcut from `mod`.
 */
export const recordedKeysToBinding = (recorded: string[], apple: boolean): string => {
  const primary = apple ? 'meta' : 'ctrl'

  return normalizeShortcutKeys(recorded.map((token) => (token === primary ? 'mod' : token)))
}
