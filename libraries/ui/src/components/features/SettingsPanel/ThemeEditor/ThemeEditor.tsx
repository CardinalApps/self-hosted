import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { accentColorFactory } from '@cardinalapps/app-settings/src/common/accent_color'
import type { CustomTheme } from '@cardinalapps/app-settings/src/common/custom_themes'
import type { ThemeOverrides } from '@cardinalapps/app-settings/src/common/theme_overrides'
import { exposedThemeTokens, themeTokens } from '@cardinalapps/app-settings/src/themeTokens'
import type { ThemeToken } from '@cardinalapps/app-settings/src/themeTokens'
import type { SupportedCardinalApp, SupportedLang } from '@cardinalapps/app-settings/src/types'

import ColorInput from '../../../forms/ColorInput'
import RangeInput from '../../../forms/RangeInput'
import Select from '../../../forms/Select'
import Button from '../../../interaction/Button'
import SlideToggle from '../../../interaction/SlideToggle'

import { useAppDispatch } from '../../../../hooks/useAppDispatch'
import { settingsActions, settingsSelectors } from '../../../../store/slices/settings'

import i18n from '../i18n'

import './ThemeEditor.css'

type ThemeEditorSettings = {
  lang: SupportedLang,
  theme: string,
  accent_color: string,
  custom_themes: CustomTheme[],
  theme_overrides: ThemeOverrides,
}

const ACCENT_COLOR_DEFAULT = accentColorFactory(
  undefined as unknown as SupportedCardinalApp,
  'en',
).defaultValue as string

// The exposed tokens grouped into sections, in manifest order
const tokenGroups: { name: string, tokens: ThemeToken[] }[] = []
exposedThemeTokens.forEach((token) => {
  const group = tokenGroups.find((candidate) => candidate.name === token.group)
  if (group) {
    group.tokens.push(token)
  } else {
    tokenGroups.push({ name: token.group, tokens: [token] })
  }
})

// Curated font stacks; the first entry must byte-match the themes.css default
const fontOptions = (lang: SupportedLang): Record<string, string> => ({
  "'Heebo', 'Helvetica', 'Arial', sans-serif": i18n['settings.theme-editor.font.default'][lang],
  "system-ui, -apple-system, 'Segoe UI', 'Roboto', sans-serif": i18n['settings.theme-editor.font.system'][lang],
  "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif": i18n['settings.theme-editor.font.humanist'][lang],
  "'Georgia', 'Times New Roman', serif": i18n['settings.theme-editor.font.serif'][lang],
  "ui-monospace, 'Menlo', 'Consolas', monospace": i18n['settings.theme-editor.font.mono'][lang],
})

/**
 * The bespoke theme editor: every exposed theme token as a live input, grouped
 * into collapsible sections. Edits are stored as sparse overrides in the
 * theme_overrides setting and applied by useAppliedTheme; anything untouched
 * keeps following the active theme's CSS.
 */
const ThemeEditor = () => {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current) as unknown as ThemeEditorSettings
  const { lang, theme, accent_color: accentColor } = settings
  const customThemes = settings.custom_themes || []
  const overrides = settings.theme_overrides || {}

  const selectedCustomTheme = customThemes.find((customTheme) => `custom:${customTheme.id}` === theme)

  const probeRef = useRef<HTMLDivElement>(null)
  const [appliedBaseTheme, setAppliedBaseTheme] = useState('light')
  const [baseValues, setBaseValues] = useState<Record<string, string>>({})

  /**
   * Track which built-in theme the surrounding app actually has applied. Read from the DOM rather
   * than the theme setting so the editor stays truthful in hosts where the two can diverge (eg. the
   * Storybook preview, where the toolbar drives data-theme).
   */
  useEffect(() => {
    const host = probeRef.current?.parentElement?.closest('[data-theme]')
    const domTheme = host?.getAttribute('data-theme')
    if (domTheme && domTheme !== appliedBaseTheme) {
      setAppliedBaseTheme(domTheme)
    }
  })

  /**
   * Read every token's un-overridden value from the probe element. The probe
   * carries its own data-theme attribute, so the theme CSS matches it directly
   * and beats any inline overrides inherited from the app root.
   */
  useEffect(() => {
    if (!probeRef.current) {
      return
    }

    const computed = getComputedStyle(probeRef.current)
    const values: Record<string, string> = {}
    themeTokens.forEach((token) => {
      values[token.varName] = computed.getPropertyValue(token.varName).trim()
    })
    setBaseValues(values)
  }, [appliedBaseTheme])

  // The value a token's input should show right now
  const currentValue = (token: ThemeToken): string => {
    if (token.varName === '--accent-color') {
      return accentColor || ACCENT_COLOR_DEFAULT
    }

    return overrides[token.varName]
      ?? selectedCustomTheme?.vars?.[token.varName]
      ?? baseValues[token.varName]
      ?? ''
  }

  // Whether the token currently diverges from what its theme defines
  const isOverridden = (token: ThemeToken): boolean => {
    if (token.varName === '--accent-color') {
      return !!accentColor && accentColor !== ACCENT_COLOR_DEFAULT
    }

    return token.varName in overrides
  }

  const setOverride = (varName: string, value: string) => {
    if (varName === '--accent-color') {
      dispatch(settingsActions.set({ key: 'accent_color', value }))
      return
    }

    dispatch(settingsActions.set({ key: 'theme_overrides', value: { ...overrides, [varName]: value } }))
  }

  const clearOverride = (varName: string) => {
    if (varName === '--accent-color') {
      dispatch(settingsActions.set({ key: 'accent_color', value: ACCENT_COLOR_DEFAULT }))
      return
    }

    const next = { ...overrides }
    delete next[varName]
    dispatch(settingsActions.set({ key: 'theme_overrides', value: next }))
  }

  // Pick the right input for the token
  const renderInput = (token: ThemeToken) => {
    if (token.type === 'font') {
      return (
        <Select
          name={token.varName}
          options={fontOptions(lang)}
          value={currentValue(token)}
          min={1}
          multi={false}
          size="s"
          onChange={(value) => setOverride(token.varName, value)}
        />
      )
    }

    if (token.type === 'length') {
      return (
        <RangeInput
          name={token.varName}
          value={Math.round(parseFloat(currentValue(token)) || 0)}
          min={token.min}
          max={token.max}
          unit="px"
          onChange={(value) => setOverride(token.varName, `${value}px`)}
        />
      )
    }

    return (
      <ColorInput
        name={token.varName}
        value={currentValue(token)}
        alpha={token.alphaAllowed}
        size="s"
        onChange={(value) => setOverride(token.varName, value)}
      />
    )
  }

  return (
    <div className="theme-editor">
      <div ref={probeRef} className="theme-editor-probe" data-theme={appliedBaseTheme} aria-hidden="true" />
      {tokenGroups.map((group) => (
        <SlideToggle className="theme-editor-group" key={group.name} title={group.name}>
          <div className="group-rows">
            {group.tokens.map((token) => (
              <div className="theme-editor-row" key={token.varName}>
                <span className="row-label" title={token.varName}>{token.label}</span>
                <div className="row-controls">
                  {renderInput(token)}
                  <Button
                    circleIcon
                    icon="fas fa-undo"
                    title={i18n['settings.theme-editor.reset'][lang]}
                    disabled={!isOverridden(token)}
                    onClick={() => clearOverride(token.varName)}
                  />
                </div>
              </div>
            ))}
          </div>
        </SlideToggle>
      ))}
    </div>
  )
}

export default ThemeEditor
