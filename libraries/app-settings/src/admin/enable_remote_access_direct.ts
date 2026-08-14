import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_REMOTE_ACCESS_DIRECT_SLUG = 'enable_remote_access_direct'

export const enableRemoteAccessDirectFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_REMOTE_ACCESS_DIRECT_SLUG,
  label: i18n?.['settings.enable-remote-access-direct.label']?.[lang],
  description: i18n?.['settings.enable-remote-access-direct.desc']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: true,
})
