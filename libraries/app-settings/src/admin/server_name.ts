import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const SERVER_NAME_SLUG = 'server_name'

export const serverNameFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: SERVER_NAME_SLUG,
  label: i18n?.['settings.server-name.title']?.[lang],
  description: i18n?.['settings.server-name.desc']?.[lang],
  type: 'text',
  storage: 'home_server',
  defaultValue: '',
})
