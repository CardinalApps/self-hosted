import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { v4 as uuid } from 'uuid'
import clsx from 'clsx'

import { accentColorFactory, COLORS as ACCENT_COLOR_PRESETS } from '@cardinalapps/app-settings/src/common/accent_color'
import { themeFactory } from '@cardinalapps/app-settings/src/common/theme'
import type { CustomTheme } from '@cardinalapps/app-settings/src/common/custom_themes'
import { exposedThemeTokens, themeTokens } from '@cardinalapps/app-settings/src/themeTokens'
import type { ThemeToken } from '@cardinalapps/app-settings/src/themeTokens'
import { parseSharedTheme } from '@cardinalapps/app-settings/src/themeShare'
import type { SupportedCardinalApp, SupportedLang } from '@cardinalapps/app-settings/src/types'

import ColorInput from '../../../forms/ColorInput'
import RangeInput from '../../../forms/RangeInput'
import Select from '../../../forms/Select'
import Button from '../../../interaction/Button'
import Confirm from '../../../interaction/Confirm'
import Card from '../../../layout/Card'
import H3 from '../../../typography/H3'

import { useAppDispatch } from '../../../../hooks/useAppDispatch'
import { settingsActions, settingsSelectors } from '../../../../store/slices/settings'
import { toastActions } from '../../../../store/slices/toast'

import i18n from '../i18n'

import './ThemeEditor.css'

type ThemeEditorSettings = {
  lang: SupportedLang,
  theme: string,
  accent_color: string,
  custom_themes: CustomTheme[],
}

const ACCENT_COLOR_DEFAULT = accentColorFactory(
  undefined as unknown as SupportedCardinalApp,
  'en',
).defaultValue as string

const BUILT_IN_THEME_OPTIONS = themeFactory(
  undefined as unknown as SupportedCardinalApp,
  'en',
).options as Record<string, string>

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
 * The bespoke theme editor: every exposed theme token as a live input, grouped into titled cards.
 * Built-in themes are immutable - the first edit forks the active theme into a new custom theme
 * and selects it. Edits to a custom theme write into it directly; there is no save step.
 */
const ThemeEditor = () => {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current) as unknown as ThemeEditorSettings
  const { lang, theme, accent_color: accentColor } = settings
  const customThemes = settings.custom_themes || []

  const selectedCustomTheme = customThemes.find((customTheme) => `custom:${customTheme.id}` === theme)
  const themeVars = selectedCustomTheme?.vars || {}

  const probeRef = useRef<HTMLDivElement>(null)
  const [appliedBaseTheme, setAppliedBaseTheme] = useState('light')
  const [baseValues, setBaseValues] = useState<Record<string, string>>({})
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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

    return themeVars[token.varName]
      ?? baseValues[token.varName]
      ?? ''
  }

  // Whether the token currently diverges from what the base theme defines
  const isOverridden = (token: ThemeToken): boolean => {
    if (token.varName === '--accent-color') {
      return !!accentColor && accentColor !== ACCENT_COLOR_DEFAULT
    }

    return token.varName in themeVars
  }

  /**
   * Deliberately bespoke instead of a SettingsPanel field: the editor owns when a selection is
   * actually applied, so it can later defer the switch if it ever needs to.
   */
  const handleThemeChange = (value: string) => {
    dispatch(settingsActions.set({ key: 'theme', value }))
  }

  // The lowest "Custom Theme N" name not yet taken by an existing theme
  const nextCustomThemeName = (): string => {
    const pattern = /^Custom Theme (\d+)$/
    const highest = customThemes.reduce((max, customTheme) => {
      const match = customTheme.name.match(pattern)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)
    return i18n['settings.theme-editor.custom-theme-name'][lang].replace('{n}', String(highest + 1))
  }

  const addAndSelectTheme = (newTheme: CustomTheme) => {
    dispatch(settingsActions.set({ key: 'custom_themes', value: [...customThemes, newTheme] }))
    dispatch(settingsActions.set({ key: 'theme', value: `custom:${newTheme.id}` }))
  }

  /**
   * Create a new custom theme with the given vars on the active theme's base, and select it.
   * Editing an immutable built-in theme forks it automatically, and Duplicate forks the current
   * theme verbatim.
   */
  const forkActiveTheme = (vars: Record<string, string>) => {
    addAndSelectTheme({
      id: uuid(),
      name: nextCustomThemeName(),
      base: (selectedCustomTheme?.base || theme) as CustomTheme['base'],
      vars,
    })
  }

  const updateSelectedThemeVars = (vars: Record<string, string>) => {
    dispatch(settingsActions.set({
      key: 'custom_themes',
      value: customThemes.map((customTheme) => (
        customTheme.id === selectedCustomTheme.id ? { ...customTheme, vars } : customTheme
      )),
    }))
  }

  const setOverride = (varName: string, value: string) => {
    if (varName === '--accent-color') {
      dispatch(settingsActions.set({ key: 'accent_color', value }))
      return
    }

    if (selectedCustomTheme) {
      updateSelectedThemeVars({ ...selectedCustomTheme.vars, [varName]: value })
    } else {
      forkActiveTheme({ [varName]: value })
    }
  }

  const clearOverride = (varName: string) => {
    if (varName === '--accent-color') {
      dispatch(settingsActions.set({ key: 'accent_color', value: ACCENT_COLOR_DEFAULT }))
      return
    }

    if (!selectedCustomTheme) {
      return
    }

    const vars = { ...selectedCustomTheme.vars }
    delete vars[varName]
    updateSelectedThemeVars(vars)
  }

  const handleDuplicate = () => {
    forkActiveTheme({ ...themeVars })
  }

  const handleResetTheme = () => {
    updateSelectedThemeVars({})
  }

  /**
   * Copy the selected custom theme to the clipboard as JSON, without its local id.
   */
  const handleCopy = async () => {
    if (!selectedCustomTheme) {
      return
    }

    await navigator.clipboard.writeText(JSON.stringify({
      name: selectedCustomTheme.name,
      base: selectedCustomTheme.base,
      vars: selectedCustomTheme.vars,
    }, null, 2))

    dispatch(toastActions.addToQueue({
      type: 'success',
      title: i18n['settings.theme-editor.copied-toast'][lang],
      ttl: 3000,
    }))
  }

  /**
   * Import a theme from clipboard JSON. The payload is untrusted, so it goes through strict
   * validation against the token manifest before anything is stored.
   */
  const handlePaste = async () => {
    let raw = ''
    try {
      raw = await navigator.clipboard.readText()
    } catch {
      // Clipboard access denied; fall through to the invalid-theme toast
    }

    const shared = parseSharedTheme(raw)
    if (!shared) {
      dispatch(toastActions.addToQueue({
        type: 'danger',
        title: i18n['settings.theme-editor.import-error-toast'][lang],
        ttl: 5000,
      }))
      return
    }

    addAndSelectTheme({
      id: uuid(),
      name: shared.name || nextCustomThemeName(),
      base: shared.base,
      vars: shared.vars,
    })

    dispatch(toastActions.addToQueue({
      type: 'success',
      title: i18n['settings.theme-editor.imported-toast'][lang],
      ttl: 3000,
    }))
  }

  const handleDeleteClose = (confirmed: boolean) => {
    setConfirmingDelete(false)

    if (!confirmed || !selectedCustomTheme) {
      return
    }

    dispatch(settingsActions.set({ key: 'theme', value: selectedCustomTheme.base }))
    dispatch(settingsActions.set({
      key: 'custom_themes',
      value: customThemes.filter((customTheme) => customTheme.id !== selectedCustomTheme.id),
    }))
  }

  // The accent color is the one token that offers the app's preset palette alongside a custom color
  const presetsFor = (token: ThemeToken) => (
    token.varName === '--accent-color' ? ACCENT_COLOR_PRESETS : undefined
  )

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
        presets={presetsFor(token)}
        size="s"
        onChange={(value) => setOverride(token.varName, value)}
      />
    )
  }

  return (
    <div className="theme-editor">
      <div ref={probeRef} className="theme-editor-probe" data-theme={appliedBaseTheme} aria-hidden="true" />
      <div className="theme-editor-header">
        <Select
          name="theme"
          size="s"
          layout="underline"
          multi={false}
          min={1}
          value={theme}
          options={{
            ...BUILT_IN_THEME_OPTIONS,
            ...Object.fromEntries(customThemes.map((customTheme) => [`custom:${customTheme.id}`, customTheme.name])),
          }}
          onChange={handleThemeChange}
        />
        <div className="theme-actions">
          <Button solid disabled={!selectedCustomTheme} onClick={handleCopy}>
            {i18n['settings.theme-editor.copy'][lang]}
          </Button>
          <Button solid onClick={handlePaste}>
            {i18n['settings.theme-editor.paste'][lang]}
          </Button>
          <Button
            solid
            disabled={!selectedCustomTheme || !Object.keys(themeVars).length}
            onClick={handleResetTheme}
          >
            {i18n['settings.theme-editor.reset-theme'][lang]}
          </Button>
          <Button solid onClick={handleDuplicate}>
            {i18n['settings.theme-editor.duplicate'][lang]}
          </Button>
          <Button solid disabled={!selectedCustomTheme} onClick={() => setConfirmingDelete(true)}>
            {i18n['settings.theme-editor.delete'][lang]}
          </Button>
        </div>
      </div>
      {confirmingDelete && selectedCustomTheme && (
        <Confirm
          title={i18n['settings.theme-editor.delete-title'][lang]}
          message={i18n['settings.theme-editor.delete-message'][lang].replace('{name}', selectedCustomTheme.name)}
          confirmButtonIsDangerous
          onClose={handleDeleteClose}
        />
      )}
      {tokenGroups.map((group) => (
        <Card
          className="theme-editor-group"
          key={group.name}
          padding="thin"
          bg={2}
          border={3}
          header={<H3>{group.name}</H3>}
        >
          {group.tokens.map((token) => (
            <div className="theme-editor-row" key={token.varName}>
              <span className="row-label" title={token.varName}>{token.label}</span>
              <div className={clsx('row-controls', !!presetsFor(token) && 'stacked')}>
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
        </Card>
      ))}
    </div>
  )
}

export default ThemeEditor
