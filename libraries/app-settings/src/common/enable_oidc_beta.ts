import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'

export const ENABLE_OIDC_BETA = 'enable_oidc_beta'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const enableOidcBetaFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ENABLE_OIDC_BETA,
  label: 'Enable new SSO login flow',
  description: 'The new flow is more secure, and will soon replace the existing flow.',
  type: 'toggle',
  storage: 'client',
  defaultValue: true,
})
