import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_REMOTE_ACCESS_SLUG = 'enable_remote_access'

/*
 * Written by the Media Server rather than the client: enabling Remote Access mints a credential
 * with Cardinal Cloud and can fail, so the Admin app posts to the connect endpoints and reads the
 * outcome back from here.
 */
export const enableRemoteAccessFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_REMOTE_ACCESS_SLUG,
  label: i18n?.['settings.enable-remote-access.label']?.[lang],
  description: i18n?.['settings.enable-remote-access.desc']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: false,
})
