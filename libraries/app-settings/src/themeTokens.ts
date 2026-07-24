export type ThemeTokenType = 'color' | 'length' | 'font' | 'shadow'

export type ThemeToken = {
  // The CSS custom property name, eg. "--bg-1".
  varName: string,
  group: string,
  type: ThemeTokenType,
  label: string,
  // Only meaningful for type "color". Native <input type="color"> can't
  // represent alpha, so alpha-allowed colors need the opacity-slider variant.
  alphaAllowed?: boolean,
  // Only meaningful for type "length": the slider bounds, in px.
  min?: number,
  max?: number,
  // Whether the (future) theme editor renders an input for this token.
  // Non-exposed tokens are still part of the contract (parity-tested against
  // the theme CSS files, still captured when a theme is duplicated) - they're
  // just not user-editable yet.
  exposed: boolean,
  // true: defined per-theme in Light.css/Dark.css (value differs by base).
  // false: defined once in themes.css, shared across all themes.
  perTheme: boolean,
}

/**
 * The single source of truth for every theme CSS custom property Cardinal
 * knows about: what it's for, how it should be edited, and whether it's
 * currently user-editable. CSS remains authoritative for values - this
 * manifest describes the contract only.
 */
export const themeTokens: ThemeToken[] = [
  // --- Backgrounds (per-theme) ---
  { varName: '--bg-1', group: 'Backgrounds', type: 'color', label: 'Background 1', exposed: true, perTheme: true },
  { varName: '--bg-2', group: 'Backgrounds', type: 'color', label: 'Background 2', exposed: true, perTheme: true },
  { varName: '--bg-3', group: 'Backgrounds', type: 'color', label: 'Background 3', exposed: true, perTheme: true },
  { varName: '--bg-4', group: 'Backgrounds', type: 'color', label: 'Background 4', exposed: true, perTheme: true },
  { varName: '--bg-5', group: 'Backgrounds', type: 'color', label: 'Background 5', exposed: true, perTheme: true },

  // --- Foregrounds (per-theme) ---
  { varName: '--text-color-1', group: 'Foregrounds', type: 'color', label: 'Text 1', exposed: true, perTheme: true },
  { varName: '--text-color-2', group: 'Foregrounds', type: 'color', label: 'Text 2', exposed: true, perTheme: true },
  { varName: '--text-color-3', group: 'Foregrounds', type: 'color', label: 'Text 3', exposed: true, perTheme: true },
  { varName: '--text-color-4', group: 'Foregrounds', type: 'color', label: 'Text 4', exposed: true, perTheme: true },
  { varName: '--text-color-5', group: 'Foregrounds', type: 'color', label: 'Text 5', exposed: true, perTheme: true },

  // --- Inputs (per-theme) ---
  { varName: '--input-bg', group: 'Inputs', type: 'color', label: 'Input background', exposed: true, perTheme: true },
  { varName: '--input-search-focus-bg', group: 'Inputs', type: 'color', label: 'Search input focus background', exposed: true, perTheme: true },

  // --- Borders (per-theme) ---
  { varName: '--border-color-1', group: 'Borders', type: 'color', label: 'Border 1', exposed: true, perTheme: true },
  { varName: '--border-color-2', group: 'Borders', type: 'color', label: 'Border 2', exposed: true, perTheme: true },
  { varName: '--border-color-3', group: 'Borders', type: 'color', label: 'Border 3', exposed: true, perTheme: true },
  { varName: '--border-color-4', group: 'Borders', type: 'color', label: 'Border 4', exposed: true, perTheme: true },
  { varName: '--border-color-focus', group: 'Borders', type: 'color', label: 'Focus ring', exposed: true, perTheme: true },

  // --- Buttons (per-theme) ---
  { varName: '--button-bg', group: 'Buttons', type: 'color', label: 'Button background', exposed: true, perTheme: true },
  { varName: '--button-bg-solid', group: 'Buttons', type: 'color', label: 'Solid button background', exposed: true, perTheme: true },
  { varName: '--button-bg-hover', group: 'Buttons', type: 'color', label: 'Button hover background', exposed: true, perTheme: true },

  // --- Shadows (per-theme) - multi-layer strings, not exposed individually ---
  { varName: '--box-shadow-1', group: 'Shadows', type: 'shadow', label: 'Shadow 1', exposed: false, perTheme: true },
  { varName: '--box-shadow-2', group: 'Shadows', type: 'shadow', label: 'Shadow 2', exposed: false, perTheme: true },
  { varName: '--box-shadow-3', group: 'Shadows', type: 'shadow', label: 'Shadow 3', exposed: false, perTheme: true },
  { varName: '--box-shadow-4', group: 'Shadows', type: 'shadow', label: 'Shadow 4', exposed: false, perTheme: true },

  // --- Alerts (per-theme) ---
  { varName: '--info', group: 'Alerts', type: 'color', label: 'Info', exposed: true, perTheme: true },
  { varName: '--success', group: 'Alerts', type: 'color', label: 'Success', exposed: true, perTheme: true },
  { varName: '--warning', group: 'Alerts', type: 'color', label: 'Warning', exposed: true, perTheme: true },
  { varName: '--danger', group: 'Alerts', type: 'color', label: 'Danger', exposed: true, perTheme: true },
  { varName: '--info-bg', group: 'Alerts', type: 'color', label: 'Info background', exposed: true, perTheme: true },
  { varName: '--success-bg', group: 'Alerts', type: 'color', label: 'Success background', exposed: true, perTheme: true },
  { varName: '--warning-bg', group: 'Alerts', type: 'color', label: 'Warning background', exposed: true, perTheme: true },
  { varName: '--danger-bg', group: 'Alerts', type: 'color', label: 'Danger background', exposed: true, perTheme: true },

  // --- Scrollbar (per-theme) ---
  { varName: '--scrollbar-color', group: 'Scrollbar', type: 'color', label: 'Scrollbar thumb', exposed: true, perTheme: true },

  // --- Checkered pattern (per-theme) - low value, not exposed yet ---
  { varName: '--checkered-color-1', group: 'Checkered pattern', type: 'color', label: 'Checkered pattern 1', exposed: false, perTheme: true },
  { varName: '--checkered-color-2', group: 'Checkered pattern', type: 'color', label: 'Checkered pattern 2', exposed: false, perTheme: true },

  // --- Colors (cross-theme) ---
  { varName: '--accent-color', group: 'Colors', type: 'color', label: 'Accent color', exposed: true, perTheme: false },

  // --- Typography (cross-theme) ---
  { varName: '--font-family', group: 'Typography', type: 'font', label: 'Font', exposed: true, perTheme: false },

  // --- Spacing (cross-theme) ---
  { varName: '--gutter', group: 'Spacing', type: 'length', label: 'Base spacing', min: 12, max: 32, exposed: true, perTheme: false },
  // Naming is historically inverted (base is the smallest radius, "-m" is the
  // largest) - labels below reflect the true size ordering instead of
  // renaming the variables, which would require touching every consumer.
  { varName: '--border-radius', group: 'Spacing', type: 'length', label: 'Corner radius (small)', min: 0, max: 24, exposed: true, perTheme: false },
  { varName: '--border-radius-s', group: 'Spacing', type: 'length', label: 'Corner radius (medium)', min: 0, max: 24, exposed: true, perTheme: false },
  { varName: '--border-radius-m', group: 'Spacing', type: 'length', label: 'Corner radius (large)', min: 0, max: 24, exposed: true, perTheme: false },

  // --- Glass (cross-theme) ---
  { varName: '--glass-bg', group: 'Glass', type: 'color', label: 'Glass tint', alphaAllowed: true, exposed: true, perTheme: false },
  { varName: '--glass-blur', group: 'Glass', type: 'length', label: 'Glass blur', min: 0, max: 60, exposed: true, perTheme: false },
  { varName: '--glass-border-color', group: 'Glass', type: 'color', label: 'Glass border', alphaAllowed: true, exposed: true, perTheme: false },
  { varName: '--glass-shadow', group: 'Glass', type: 'shadow', label: 'Glass shadow', exposed: false, perTheme: false },

  // --- Timing (cross-theme) - never user-facing ---
  { varName: '--transition-speed-fast', group: 'Timing', type: 'length', label: 'Transition speed (fast)', exposed: false, perTheme: false },
  { varName: '--transition-speed-med', group: 'Timing', type: 'length', label: 'Transition speed (medium)', exposed: false, perTheme: false },
  { varName: '--transition-speed-slow', group: 'Timing', type: 'length', label: 'Transition speed (slow)', exposed: false, perTheme: false },
  { varName: '--easing-bounce', group: 'Timing', type: 'length', label: 'Bounce easing curve', exposed: false, perTheme: false },
]

/**
 * The subset of tokens whose values live in the per-theme CSS files
 * (Light.css / Dark.css) rather than the shared themes.css.
 */
export const perThemeTokens = themeTokens.filter((token) => token.perTheme)

/**
 * The subset of tokens whose values live in the shared themes.css.
 */
export const crossThemeTokens = themeTokens.filter((token) => !token.perTheme)

/**
 * The subset of tokens the theme editor currently renders an input for.
 */
export const exposedThemeTokens = themeTokens.filter((token) => token.exposed)
