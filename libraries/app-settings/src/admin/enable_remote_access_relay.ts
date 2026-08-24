import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_REMOTE_ACCESS_RELAY_SLUG = 'enable_remote_access_relay'

export const enableRemoteAccessRelayFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_REMOTE_ACCESS_RELAY_SLUG,
  label: i18n?.['settings.enable-remote-access-relay.label']?.[lang],
  description: i18n?.['settings.enable-remote-access-relay.desc']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: true,
})
