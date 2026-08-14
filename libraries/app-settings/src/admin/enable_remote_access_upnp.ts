import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_REMOTE_ACCESS_UPNP_SLUG = 'enable_remote_access_upnp'

/*
 * Written by the Media Server rather than the client: turning port forwarding on maps the port
 * right away, so the Admin app posts to the port-mapper endpoint and reads the outcome back
 * from here.
 */
export const enableRemoteAccessUpnpFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_REMOTE_ACCESS_UPNP_SLUG,
  label: i18n?.['settings.enable-remote-access-upnp.label']?.[lang],
  description: i18n?.['settings.enable-remote-access-upnp.desc']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: false,
})
