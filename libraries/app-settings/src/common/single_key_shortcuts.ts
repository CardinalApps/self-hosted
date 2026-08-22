import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const SINGLE_KEY_SHORTCUTS_SLUG = 'single_key_shortcuts'

export const singleKeyShortcutsFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: SINGLE_KEY_SHORTCUTS_SLUG,
  label: i18n?.['settings.single-key-shortcuts.label']?.[lang],
  description: i18n?.['settings.single-key-shortcuts.desc']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  scope: 'user',
  defaultValue: false,
})
