import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ENABLE_GUEST_ACCOUNT_SLUG = 'enable_guest_account'

/**
 * @deprecated This has been deprecated in favour of using an `enabled` status for all users.
 */
export const enableGuestAccountFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_GUEST_ACCOUNT_SLUG,
  label: i18n?.['settings.guest-account.enable-label']?.[lang],
  type: 'toggle',
  storage: 'home_server',
  defaultValue: true,
  description: i18n?.['settings.guest-account.desc']?.[lang],
  beforeChange: () => { console.log('b4 change') },
  afterChange: () => { console.log('after change') },
})
