import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_CUSTOM_CONTEXT_MENU_SLUG = 'enable_custom_context_menu'

export const enableCustomContextMenuFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_CUSTOM_CONTEXT_MENU_SLUG,
  label: i18n?.['settings.custom-context-menu.enable-label']?.[lang],
  type: 'toggle',
  storage: 'client',
  defaultValue: false, // In Electron this should be true
})
