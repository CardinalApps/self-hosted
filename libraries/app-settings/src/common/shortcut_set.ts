import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import { DEFAULT_SHORTCUT_SET } from '../shortcuts'
import i18n from '../i18n'

export const SHORTCUT_SET_SLUG = 'shortcut_set'

export const shortcutSetFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: SHORTCUT_SET_SLUG,
  label: i18n?.['settings.shortcut-set.label']?.[lang],
  type: 'select',
  storage: 'home_server',
  scope: 'user',
  defaultValue: DEFAULT_SHORTCUT_SET,
  options: {
    [DEFAULT_SHORTCUT_SET]: i18n['settings.shortcut-set.default'][lang],
  },
})
