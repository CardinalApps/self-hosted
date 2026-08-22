import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  asShortcutSets,
  resolveShortcutBindings,
  resolveShortcutKeys,
} from '@cardinalapps/app-settings/src/shortcuts'

import { useAppDispatch } from './useAppDispatch'
import { settingsSelectors } from '../store/slices/settings'

/**
 * Listens for the user's keyboard shortcuts and dispatches the action each one is bound to.
 *
 * The selected set follows the account into every Cardinal app, so it can hold shortcuts for
 * actions the app at hand has no use for; those simply do nothing. Presses inside a text field
 * are ignored by `react-hotkeys-hook` itself, which is why the Escape handling elsewhere in the
 * apps is untouched by this - those are not shortcuts.
 */
const useKeyboardShortcuts = () => {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current) as unknown as {
    shortcut_set?: unknown,
    custom_shortcut_sets?: unknown,
    single_key_shortcuts?: boolean,
  }

  const bindings = useMemo(() => (
    resolveShortcutBindings(settings?.shortcut_set, asShortcutSets(settings?.custom_shortcut_sets))
      .map((binding) => ({
        ...binding,
        keys: resolveShortcutKeys(binding.keys, !!settings?.single_key_shortcuts),
      }))
  ), [settings?.shortcut_set, settings?.custom_shortcut_sets, settings?.single_key_shortcuts])

  useHotkeys(
    bindings.map((binding) => binding.keys),
    (event, hotkey) => {
      const pressed = bindings.find((binding) => binding.keys === hotkey.hotkey)

      if (pressed) {
        dispatch({ type: pressed.action })
      }
    },
    // Browsers claim some of these combinations themselves, so the page takes them first
    { preventDefault: true },
    [bindings],
  )
}

export default useKeyboardShortcuts
