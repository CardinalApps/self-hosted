import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import type { ShortcutSet } from '../shortcuts'
import i18n from '../i18n'

export const CUSTOM_SHORTCUT_SETS_SLUG = 'custom_shortcut_sets'

export const customShortcutSetsFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: CUSTOM_SHORTCUT_SETS_SLUG,
  label: i18n?.['settings.custom-shortcut-sets.label']?.[lang],
  type: 'json',
  storage: 'home_server',
  scope: 'user',
  defaultValue: [] as ShortcutSet[],
})
