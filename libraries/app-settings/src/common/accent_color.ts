import { SettingsFieldFactory, SupportedCardinalApp, SupportedLang } from '../types'
import i18n from '../i18n'

export const ACCENT_COLOR_SLUG = 'accent_color'

export const COLORS = {
  '#cc4c43': 'Cardinal',
  '#dd6620': 'Creamsicle',
  '#3d3ddb': 'Pillow Case',
  '#0f6bdd': 'Casual',
  '#2da964': 'Fresh Breath',
  '#276e09': 'Zergling',
  '#613bd5': 'Potpourri',
  '#e9219c': 'Flamingo Jam',
  '#e9e929': 'Sunny D',
  '#525252': 'Soulless',
}

export const accentColorFactory: SettingsFieldFactory = (app: SupportedCardinalApp, lang: SupportedLang) => ({
  slug: ACCENT_COLOR_SLUG,
  label: i18n?.['settings.accent-color.title']?.[lang],
  type: 'swatches',
  storage: 'client',
  defaultValue: '#cc4c43',
  options: { ...COLORS },
})
