import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { v4 as uuid } from 'uuid'
import clsx from 'clsx'

import { accentColorFactory, COLORS as ACCENT_COLOR_PRESETS } from '@cardinalapps/app-settings/src/common/accent_color'
import { asCustomThemes } from '@cardinalapps/app-settings/src/common/custom_themes'
import { resolveBaseTheme, themeFactory } from '@cardinalapps/app-settings/src/common/theme'
import type { CustomTheme } from '@cardinalapps/app-settings/src/common/custom_themes'
import { exposedThemeTokens, themeTokens } from '@cardinalapps/app-settings/src/themeTokens'
import type { ThemeToken } from '@cardinalapps/app-settings/src/themeTokens'
import { parseSharedTheme } from '@cardinalapps/app-settings/src/themeShare'
import type { SupportedCardinalApp, SupportedLang } from '@cardinalapps/app-settings/src/types'

import ColorInput from '../../../forms/ColorInput'
import RangeInput from '../../../forms/RangeInput'
import Select from '../../../forms/Select'
import TextInput from '../../../forms/TextInput'
import Button from '../../../interaction/Button'
import Confirm from '../../../interaction/Confirm'
import Card from '../../../layout/Card'
import Modal from '../../../layout/Modal'
import H3 from '../../../typography/H3'

import { useAppDispatch } from '../../../../hooks/useAppDispatch'
import useDebouncedCallback from '../../../../hooks/useDebouncedCallback'
import { settingsActions, settingsSelectors } from '../../../../store/slices/settings'
import set from '../../../../store/slices/settings/thunks/set'
import { toastActions } from '../../../../store/slices/toast'
import { CardinalApp } from '../../../../lib/env/cardinal'

import i18n from '../i18n'

import './ThemeEditor.css'

type ThemeEditorSettings = {
  lang: SupportedLang,
  theme: string,
  accent_color: string,
  custom_themes: unknown,
}

const ACCENT_COLOR_DEFAULT = accentColorFactory(
  undefined as unknown as SupportedCardinalApp,
  'en',
).defaultValue as string

const BUILT_IN_THEME_OPTIONS = themeFactory(
  undefined as unknown as SupportedCardinalApp,
  'en',
).options as Record<string, string>

const THEME_NAME_MAX_LENGTH = 24

/*
 * How long edits settle before they are written to the Media Server. Theme settings are stored per
 * account, so every edit is a request - without this, dragging a colour would send one every time
 * the input emits.
 */
const SERVER_PERSIST_DELAY = 600

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
const ThemeEditor = ({ app }: { app: CardinalApp }) => {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current) as unknown as ThemeEditorSettings
  const { lang, theme, accent_color: accentColor } = settings
  const customThemes = asCustomThemes(settings.custom_themes)

  const selectedCustomTheme = customThemes.find((customTheme) => `custom:${customTheme.id}` === theme)
  const themeVars = selectedCustomTheme?.vars || {}

  const probeRef = useRef<HTMLDivElement>(null)
  const [appliedBaseTheme, setAppliedBaseTheme] = useState('light')
  const [baseValues, setBaseValues] = useState<Record<string, string>>({})
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [renameDraft, setRenameDraft] = useState<string | null>(null)

  const unsavedSettings = useRef<Record<string, unknown>>({})

  const persistSettings = useDebouncedCallback(() => {
    const settings = unsavedSettings.current
    unsavedSettings.current = {}

    if (Object.keys(settings).length) {
      dispatch(set({ settings, app }))
    }
  }, SERVER_PERSIST_DELAY)

  /**
   * Apply a theme setting locally right away so the editor previews live, and persist it to the
   * Media Server once the edits settle. The `set` thunk only lands in the store on success, so it
   * can't drive the preview on its own.
   */
  const saveSetting = (key: string, value: unknown) => {
    dispatch(settingsActions.set({ key, value }))
    unsavedSettings.current[key] = value
    persistSettings()
  }

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
    saveSetting('theme', value)
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
    saveSetting('custom_themes', [...customThemes, newTheme])
    saveSetting('theme', `custom:${newTheme.id}`)
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
      // Resolved rather than copied: a fork of a theme whose base has gone stale would otherwise
      // inherit the stale value, and a base that isn't a built-in theme applies no CSS at all
      base: resolveBaseTheme(theme, customThemes),
      vars,
    })
  }

  const updateSelectedTheme = (patch: Partial<CustomTheme>) => {
    saveSetting('custom_themes', customThemes.map((customTheme) => (
      customTheme.id === selectedCustomTheme.id ? { ...customTheme, ...patch } : customTheme
    )))
  }

  /*
   * Inputs can emit before the editor has read the base values - Select in particular normalizes
   * an empty value on mount and reports it as a change. Overriding a token with nothing is
   * meaningless, and acting on it would fork a custom theme the user never asked for.
   */
  const setOverride = (varName: string, value: string) => {
    if (!value) {
      return
    }

    if (varName === '--accent-color') {
      saveSetting('accent_color', value)
      return
    }

    if (selectedCustomTheme) {
      updateSelectedTheme({ vars: { ...selectedCustomTheme.vars, [varName]: value } })
    } else {
      forkActiveTheme({ [varName]: value })
    }
  }

  const clearOverride = (varName: string) => {
    if (varName === '--accent-color') {
      saveSetting('accent_color', ACCENT_COLOR_DEFAULT)
      return
    }

    if (!selectedCustomTheme) {
      return
    }

    const vars = { ...selectedCustomTheme.vars }
    delete vars[varName]
    updateSelectedTheme({ vars })
  }

  const handleDuplicate = () => {
    forkActiveTheme({ ...themeVars })
  }

  const handleResetTheme = () => {
    updateSelectedTheme({ vars: {} })
  }

  const handleRenameSave = () => {
    const name = renameDraft?.trim().slice(0, THEME_NAME_MAX_LENGTH)
    if (name) {
      updateSelectedTheme({ name })
    }
    setRenameDraft(null)
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

    saveSetting('theme', resolveBaseTheme(theme, customThemes))
    saveSetting('custom_themes', customThemes.filter((customTheme) => customTheme.id !== selectedCustomTheme.id))
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
          <Button
            solid
            disabled={!selectedCustomTheme}
            data-testid="theme-rename"
            onClick={() => setRenameDraft(selectedCustomTheme.name)}
          >
            {i18n['settings.theme-editor.rename'][lang]}
          </Button>
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
          <Button solid data-testid="theme-duplicate" onClick={handleDuplicate}>
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
      {renameDraft !== null && selectedCustomTheme && (
        <Modal
          width={420}
          onClose={() => setRenameDraft(null)}
          footer={(
            <>
              <Button textual onClick={() => setRenameDraft(null)}>
                {i18n['settings.theme-editor.rename-cancel'][lang]}
              </Button>
              <Button textual data-testid="theme-rename-save" disabled={!renameDraft.trim()} onClick={handleRenameSave}>
                {i18n['settings.theme-editor.rename-save'][lang]}
              </Button>
            </>
          )}
        >
          <div className="theme-rename">
            <H3>{i18n['settings.theme-editor.rename-title'][lang]}</H3>
            <TextInput
              data-testid="theme-rename-input"
              value={renameDraft}
              maxLength={THEME_NAME_MAX_LENGTH}
              onChange={setRenameDraft}
              onEnter={handleRenameSave}
            />
          </div>
        </Modal>
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
