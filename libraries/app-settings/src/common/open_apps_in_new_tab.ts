import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const OPEN_APPS_IN_NEW_TAB_SLUG = 'open_apps_in_new_tab'

export const openAppsInNewTabFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: OPEN_APPS_IN_NEW_TAB_SLUG,
  label: i18n?.['settings.open-apps-in-new-tab.label']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: true,
})
