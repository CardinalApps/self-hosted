import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useRecordHotkeys } from 'react-hotkeys-hook'
import { v4 as uuid } from 'uuid'
import clsx from 'clsx'

import {
  allShortcutActions,
  asShortcutSets,
  DEFAULT_SHORTCUT_SET,
  defaultShortcuts,
  isShortcutModifier,
  resolveShortcutBindings,
  resolveShortcutKeys,
  shortcutConflicts,
} from '@cardinalapps/app-settings/src/shortcuts'
import type { ShortcutBinding, ShortcutSet } from '@cardinalapps/app-settings/src/shortcuts'
import type { SupportedLang } from '@cardinalapps/app-settings/src/types'

import Button from '../../../interaction/Button'
import Confirm from '../../../interaction/Confirm'
import Select from '../../../forms/Select'
import TextInput from '../../../forms/TextInput'
import ToggleSwitch from '../../../forms/ToggleSwitch'
import Icon from '../../../typography/Icon'
import H3 from '../../../typography/H3'
import Kbd from '../../../typography/Kbd'
import Modal from '../../../layout/Modal'

import { isApplePlatform } from '../../../../lib/shortcuts/keycaps'
import { recordedKeysToBinding } from '../../../../lib/shortcuts/record'
import { useAppDispatch } from '../../../../hooks/useAppDispatch'
import { settingsActions, settingsSelectors } from '../../../../store/slices/settings'
import set from '../../../../store/slices/settings/thunks/set'
import { CardinalApp } from '../../../../lib/env/cardinal'

import i18n from '../i18n'

import './KeyboardShortcuts.css'

// Escape leaves recording rather than being recorded: it is what closes modals and drawers
// throughout the apps, and those are deliberately not shortcuts.
const UNRECORDABLE = ['escape']

const SET_NAME_MAX_LENGTH = 24

type KeyboardShortcutsSettings = {
  lang: SupportedLang,
  shortcut_set: string,
  custom_shortcut_sets: unknown,
  single_key_shortcuts?: boolean,
}

/**
 * The keyboard shortcuts editor: one row per binding, each pairing the keys that fire it with
 * the action it runs.
 *
 * Sets work the way saved themes do. The built-in `Default` set is immutable, so the first edit
 * to it forks a copy and selects that - which is what makes the shipped shortcuts something the
 * user can always come back to, however much they have deleted.
 */
const KeyboardShortcuts = ({ app }: { app: CardinalApp }) => {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current) as unknown as KeyboardShortcutsSettings
  const { lang, shortcut_set: selectedSet, single_key_shortcuts: singleKeyMode } = settings

  const customSets = asShortcutSets(settings.custom_shortcut_sets)
  const selectedCustomSet = customSets.find((customSet) => `custom:${customSet.id}` === selectedSet)
  const bindings = resolveShortcutBindings(selectedSet, customSets)
  const conflicts = shortcutConflicts(bindings, !!singleKeyMode)
  const actions = allShortcutActions(lang)

  /*
   * A shortcut being added has no keys yet, which is not something that can be stored - a binding
   * with nothing to press would never fire. So it is held here until its keys are recorded, and
   * abandoning the recording abandons the row.
   */
  const [draftAction, setDraftAction] = useState<string | null>(null)
  const rows = draftAction ? [...bindings, { keys: '', action: draftAction }] : bindings

  const [recordingIndex, setRecordingIndex] = useState<number | null>(null)
  const [recordedKeys, { start, stop, resetKeys }] = useRecordHotkeys(false, UNRECORDABLE)
  const recordingButton = useRef<HTMLButtonElement>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [renameDraft, setRenameDraft] = useState<string | null>(null)

  const t = (key: string) => i18n[key]?.[lang]

  // Applied locally first so the page reacts to the edit without waiting for the round trip
  const saveSettings = (patch: Record<string, unknown>) => {
    Object.entries(patch).forEach(([key, value]) => dispatch(settingsActions.set({ key, value })))
    dispatch(set({ settings: patch, app }))
  }

  // The lowest "Custom Shortcuts N" name not yet taken by an existing set
  const nextCustomSetName = (): string => {
    const pattern = /^Custom Shortcuts (\d+)$/
    const highest = customSets.reduce((max, customSet) => {
      const match = customSet.name.match(pattern)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)
    return i18n['settings.shortcuts.custom-set-name'][lang].replace('{n}', String(highest + 1))
  }

  const addAndSelectSet = (newSet: ShortcutSet) => {
    saveSettings({
      custom_shortcut_sets: [...customSets, newSet],
      shortcut_set: `custom:${newSet.id}`,
    })
  }

  /**
   * Write the given bindings to the selected set. The built-in set cannot be written to, so an
   * edit to it forks a copy carrying the change and selects that instead.
   */
  const saveBindings = (next: ShortcutBinding[]) => {
    if (selectedCustomSet) {
      saveSettings({
        custom_shortcut_sets: customSets.map((customSet) => (
          customSet.id === selectedCustomSet.id ? { ...customSet, bindings: next } : customSet
        )),
      })
      return
    }

    addAndSelectSet({ id: uuid(), name: nextCustomSetName(), bindings: next })
  }

  const stopRecording = () => {
    stop()
    resetKeys()
    setRecordingIndex(null)
    setDraftAction(null)
  }

  const startRecording = (index: number) => {
    resetKeys()
    setRecordingIndex(index)
    start()
  }

  /**
   * Commit a recording once a key of its own has been pressed. Modifiers alone keep the row
   * listening, which is what lets a combination be built up one key at a time.
   */
  useEffect(() => {
    if (recordingIndex === null) {
      return
    }

    const recorded = [...recordedKeys]

    if (!recorded.some((token) => !isShortcutModifier(token))) {
      return
    }

    const keys = recordedKeysToBinding(recorded, isApplePlatform())

    if (keys && draftAction) {
      saveBindings([...bindings, { keys, action: draftAction }])
    } else if (keys) {
      saveBindings(bindings.map((binding, index) => (index === recordingIndex ? { ...binding, keys } : binding)))
    }

    stopRecording()
  }, [recordedKeys, recordingIndex])

  /*
   * Hand focus to the row that is listening, including a row that was just added, whose button
   * the user never clicked. A recording that is not focused could not be called off by clicking
   * away, and would rebind the row on the next keypress anywhere in the app.
   */
  useEffect(() => {
    if (recordingIndex !== null) {
      recordingButton.current?.focus()
    }
  }, [recordingIndex])

  /**
   * Escape leaves the row as it was. Taken in the capture phase so the settings panel's own
   * Escape handler does not close the whole panel out from under the recording.
   */
  useEffect(() => {
    if (recordingIndex === null) {
      return
    }

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        stopRecording()
      }
    }

    document.addEventListener('keydown', onEsc, true)
    return () => document.removeEventListener('keydown', onEsc, true)
  }, [recordingIndex])

  // A new row goes straight into recording, since it is the keys that decide whether it exists
  const addShortcut = () => {
    setDraftAction(actions[0]?.id)
    startRecording(bindings.length)
  }

  const removeShortcut = (index: number) => {
    stopRecording()

    if (index < bindings.length) {
      saveBindings(bindings.filter((binding, current) => current !== index))
    }
  }

  const changeAction = (index: number, action: string) => {
    if (index < bindings.length) {
      saveBindings(bindings.map((binding, current) => (current === index ? { ...binding, action } : binding)))
    } else {
      setDraftAction(action)
    }
  }

  const handleDuplicate = () => {
    addAndSelectSet({ id: uuid(), name: nextCustomSetName(), bindings })
  }

  const handleResetSet = () => {
    saveBindings(defaultShortcuts)
  }

  const handleRenameSave = () => {
    const name = renameDraft?.trim().slice(0, SET_NAME_MAX_LENGTH)

    if (name && selectedCustomSet) {
      saveSettings({
        custom_shortcut_sets: customSets.map((customSet) => (
          customSet.id === selectedCustomSet.id ? { ...customSet, name } : customSet
        )),
      })
    }

    setRenameDraft(null)
  }

  const handleDeleteClose = (confirmed: boolean) => {
    setConfirmingDelete(false)

    if (!confirmed || !selectedCustomSet) {
      return
    }

    saveSettings({
      shortcut_set: DEFAULT_SHORTCUT_SET,
      custom_shortcut_sets: customSets.filter((customSet) => customSet.id !== selectedCustomSet.id),
    })
  }

  const actionOptions = Object.fromEntries(actions.map((action) => [action.id, action.label]))

  return (
    <div className="keyboard-shortcuts">
      <ToggleSwitch
        value={!!singleKeyMode}
        onChange={(value) => saveSettings({ single_key_shortcuts: value })}
        layout="box"
        title={t('settings.shortcuts.single-key-title')}
        description={t('settings.shortcuts.single-key-desc')}
      />

      <div className="shortcut-set-header">
        <Select
          name="shortcut_set"
          size="s"
          layout="underline"
          multi={false}
          min={1}
          value={selectedSet}
          options={{
            [DEFAULT_SHORTCUT_SET]: t('settings.shortcuts.set-default'),
            ...Object.fromEntries(customSets.map((customSet) => [`custom:${customSet.id}`, customSet.name])),
          }}
          onChange={(value) => saveSettings({ shortcut_set: value })}
        />
        <div className="shortcut-set-actions">
          <Button
            solid
            disabled={!selectedCustomSet}
            data-testid="shortcut-set-rename"
            onClick={() => setRenameDraft(selectedCustomSet.name)}
          >
            {t('settings.shortcuts.rename')}
          </Button>
          <Button solid data-testid="shortcut-set-duplicate" onClick={handleDuplicate}>
            {t('settings.shortcuts.duplicate')}
          </Button>
          <Button solid disabled={!selectedCustomSet} onClick={handleResetSet}>
            {t('settings.shortcuts.reset')}
          </Button>
          <Button solid disabled={!selectedCustomSet} onClick={() => setConfirmingDelete(true)}>
            {t('settings.shortcuts.delete')}
          </Button>
        </div>
      </div>

      <div className="shortcut-row heading">
        <div className="shortcut-keys">{t('settings.shortcuts.column-keys')}</div>
        <div className="shortcut-action">{t('settings.shortcuts.column-action')}</div>
        <div className="shortcut-controls" />
      </div>

      {rows.map((binding, index) => {
        const recording = recordingIndex === index
        const conflicted = conflicts.has(resolveShortcutKeys(binding.keys, !!singleKeyMode))

        return (
          <div key={index} className="shortcut-row">
            <div className="shortcut-keys">
              <button
                type="button"
                ref={recording ? recordingButton : undefined}
                className={clsx('keys-button', recording && 'recording', conflicted && 'conflicted')}
                title={conflicted ? t('settings.shortcuts.conflict') : undefined}
                onClick={() => (recording ? stopRecording() : startRecording(index))}
                onBlur={() => recording && stopRecording()}
              >
                {recording
                  ? <span className="recording-prompt">{t('settings.shortcuts.press-keys')}</span>
                  : <Kbd keys={resolveShortcutKeys(binding.keys, !!singleKeyMode)} size="s" />
                }
              </button>
              {!!conflicted && <Icon fa="fas fa-exclamation-triangle" title={t('settings.shortcuts.conflict')} />}
            </div>
            <div className="shortcut-action">
              <Select
                size="s"
                value={binding.action}
                options={actionOptions}
                onChange={(selected) => changeAction(index, selected || binding.action)}
              />
            </div>
            <div className="shortcut-controls">
              <button
                type="button"
                className="remove"
                aria-label={t('settings.shortcuts.remove')}
                title={t('settings.shortcuts.remove')}
                onClick={() => removeShortcut(index)}
              >
                <Icon fa="fas fa-times" />
              </button>
            </div>
          </div>
        )
      })}

      <Button icon="fas fa-plus" onClick={addShortcut} disabled={!!draftAction}>
        {t('settings.shortcuts.add')}
      </Button>

      {confirmingDelete && selectedCustomSet && (
        <Confirm
          title={t('settings.shortcuts.delete-title')}
          message={t('settings.shortcuts.delete-message').replace('{name}', selectedCustomSet.name)}
          confirmButtonIsDangerous
          onClose={handleDeleteClose}
        />
      )}

      {renameDraft !== null && selectedCustomSet && (
        <Modal
          width={420}
          onClose={() => setRenameDraft(null)}
          header={<H3>{t('settings.shortcuts.rename-title')}</H3>}
          footer={(
            <>
              <Button textual onClick={() => setRenameDraft(null)}>
                {t('settings.shortcuts.rename-cancel')}
              </Button>
              <Button
                textual
                data-testid="shortcut-set-rename-save"
                disabled={!renameDraft.trim()}
                onClick={handleRenameSave}
              >
                {t('settings.shortcuts.rename-save')}
              </Button>
            </>
          )}
        >
          <div className="shortcut-set-rename">
            <TextInput
              data-testid="shortcut-set-rename-input"
              value={renameDraft}
              maxLength={SET_NAME_MAX_LENGTH}
              onChange={setRenameDraft}
              onEnter={handleRenameSave}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}

export default KeyboardShortcuts
