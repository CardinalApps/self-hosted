import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useSelector } from 'react-redux'

import type { CustomTheme } from '@cardinalapps/app-settings/src/common/custom_themes'
import type { ThemeOverrides } from '@cardinalapps/app-settings/src/common/theme_overrides'

import { settingsSelectors } from '../store/slices/settings'

type ThemeSettings = {
  theme: string,
  accent_color: string,
  custom_themes: CustomTheme[],
  theme_overrides: ThemeOverrides,
}

/**
 * Applies the theme settings to the given element: the accent colour, the selected custom theme's
 * variables, and the user's sparse per-variable overrides on top. The element is expected to be the
 * one carrying the `data-theme` attribute, which should be set to the returned base theme.
 */
const useAppliedTheme = (ref: RefObject<HTMLElement | null>) => {
  const {
    theme,
    accent_color: accentColor,
    custom_themes: customThemes = [],
    theme_overrides: themeOverrides = {},
  } = useSelector(settingsSelectors.current) as unknown as ThemeSettings

  const selectedCustomTheme = theme?.startsWith('custom:')
    ? customThemes.find((customTheme) => `custom:${customTheme.id}` === theme)
    : undefined
  const resolvedBaseTheme = selectedCustomTheme?.base || theme

  /**
   * Apply the user's custom accent color.
   */
  useEffect(() => {
    if (accentColor && ref.current) {
      ref.current.style.setProperty('--accent-color', accentColor)
    }
  }, [accentColor])

  /**
   * Apply the selected custom theme's variables with the sparse overrides layered on top. Excludes
   * --accent-color, which the effect above owns independently of theme selection. Removes everything
   * it set on cleanup so switching themes never leaves stale inline styles behind.
   */
  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }

    const vars = { ...(selectedCustomTheme?.vars || {}), ...themeOverrides }
    delete vars['--accent-color']

    Object.entries(vars).forEach(([varName, value]) => {
      if (value) {
        el.style.setProperty(varName, value)
      }
    })

    return () => {
      Object.keys(vars).forEach((varName) => {
        el.style.removeProperty(varName)
      })
    }
  }, [selectedCustomTheme, themeOverrides])

  return { resolvedBaseTheme }
}

export default useAppliedTheme
