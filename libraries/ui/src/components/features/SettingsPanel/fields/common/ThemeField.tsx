import { useSelector } from 'react-redux'
import { v4 as uuid } from 'uuid'

import type { CustomTheme } from '@cardinalapps/app-settings/src/common/custom_themes'
import { themeTokens } from '@cardinalapps/app-settings/src/themeTokens'

import Select from '../../../../forms/Select'
import Button from '../../../../interaction/Button'

import { useAppDispatch } from '../../../../../hooks/useAppDispatch'
import { settingsActions, settingsSelectors } from '../../../../../store/slices/settings'
import { toastActions } from '../../../../../store/slices/toast'

import i18n from '../../i18n'

type ThemeFieldProps = {
  field: { slug: string, options: Record<string, string> },
  value: string,
  onChange: (value: string) => void,
}

const CUSTOM_THEME_PREFIX = 'custom:'

/**
 * Reads the resolved value of every manifest token from whatever element
 * currently carries the theme's CSS custom properties. Used to snapshot a
 * theme so Duplicate/Save capture a full, self-contained copy.
 */
const snapshotCurrentVars = (): Record<string, string> => {
  const root = document.querySelector('[data-theme]')
  if (!root) return {}

  const computed = getComputedStyle(root)
  const vars: Record<string, string> = {}
  themeTokens.forEach((token) => {
    vars[token.varName] = computed.getPropertyValue(token.varName).trim()
  })
  return vars
}

/**
 * The theme dropdown, plus the Save/Duplicate/Delete/Export buttons that
 * operate on the currently-selected theme.
 */
const ThemeField = ({ field, value, onChange }: ThemeFieldProps) => {
  const dispatch = useAppDispatch()
  const { lang, custom_themes: customThemes = [] } = useSelector(settingsSelectors.current) as {
    lang: string,
    custom_themes: CustomTheme[],
  }

  const selectedCustomTheme = value?.startsWith(CUSTOM_THEME_PREFIX)
    ? customThemes.find((customTheme) => `${CUSTOM_THEME_PREFIX}${customTheme.id}` === value)
    : undefined

  const options = {
    ...field.options,
    ...Object.fromEntries(customThemes.map((customTheme) => [`${CUSTOM_THEME_PREFIX}${customTheme.id}`, customTheme.name])),
  }

  const setCustomThemes = (next: CustomTheme[]) => {
    dispatch(settingsActions.set({ key: 'custom_themes', value: next }))
  }

  /**
   * Copy the currently-active theme into a new, independent custom theme.
   */
  const handleDuplicate = () => {
    const base = selectedCustomTheme ? selectedCustomTheme.base : (value as 'light' | 'dark')
    const sourceName = selectedCustomTheme ? selectedCustomTheme.name : options[value]

    const newTheme: CustomTheme = {
      id: uuid(),
      name: `${sourceName} copy`,
      base,
      vars: snapshotCurrentVars(),
    }

    setCustomThemes([...customThemes, newTheme])
    onChange(`${CUSTOM_THEME_PREFIX}${newTheme.id}`)
  }

  /**
   * Re-snapshot the current values into the selected custom theme. A no-op
   * today since nothing yet diverges values from their snapshot, but wired
   * for when the variable editor lands.
   */
  const handleSave = () => {
    if (!selectedCustomTheme) return

    setCustomThemes(customThemes.map((customTheme) => (
      customTheme.id === selectedCustomTheme.id
        ? { ...customTheme, vars: snapshotCurrentVars() }
        : customTheme
    )))
    dispatch(toastActions.addToQueue({
      type: 'success',
      title: i18n['settings.theme.saved-toast'][lang],
      ttl: 3000,
    }))
  }

  /**
   * Custom themes only - built-in themes can never be deleted.
   */
  const handleDelete = () => {
    if (!selectedCustomTheme) return
    if (!window.confirm(i18n['settings.theme.delete-confirm'][lang].replace('{name}', selectedCustomTheme.name))) return

    setCustomThemes(customThemes.filter((customTheme) => customTheme.id !== selectedCustomTheme.id))
    onChange(selectedCustomTheme.base)
  }

  /**
   * Copy the currently-active theme's data to the clipboard as JSON.
   */
  const handleExport = async () => {
    const exported = selectedCustomTheme || {
      name: options[value],
      base: value,
      vars: snapshotCurrentVars(),
    }

    await navigator.clipboard.writeText(JSON.stringify({
      name: exported.name,
      base: exported.base,
      vars: exported.vars,
    }, null, 2))

    dispatch(toastActions.addToQueue({
      type: 'success',
      title: i18n['settings.theme.exported-toast'][lang],
      ttl: 3000,
    }))
  }

  return (
    <div className="theme-field">
      <Select
        name={field.slug}
        options={options}
        value={value}
        min={1}
        multi={false}
        size="s"
        onChange={onChange}
      />
      <div className="theme-field-actions">
        <Button
          circleIcon
          icon="fas fa-save"
          title={i18n['settings.theme.save'][lang]}
          disabled={!selectedCustomTheme}
          onClick={handleSave}
        />
        <Button
          circleIcon
          icon="fas fa-copy"
          title={i18n['settings.theme.duplicate'][lang]}
          onClick={handleDuplicate}
        />
        <Button
          circleIcon
          icon="fas fa-trash-alt"
          title={i18n['settings.theme.delete'][lang]}
          disabled={!selectedCustomTheme}
          onClick={handleDelete}
        />
        <Button
          circleIcon
          icon="fas fa-file-export"
          title={i18n['settings.theme.export'][lang]}
          onClick={handleExport}
        />
      </div>
    </div>
  )
}

export default ThemeField
