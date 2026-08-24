import { useState, useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import clsx from 'clsx'

import TextInput from '../TextInput'
import List from '../../interaction/List'
import type { ListItem } from '../../interaction/List/List'
import Icon from '../../typography/Icon'

import { settingsSelectors } from '../../../store/slices/settings'
import { toastActions } from '../../../store/slices/toast'

import i18n from './i18n'

import './AddRemove.css'

type Item = {
  name: string,
  value: string,
  canAdd?: boolean,
  canDelete?: boolean,
}

type AddRemoveProps = {
  name?: string,
  initialSelectedItems?: Item[],
  initialAvailableItems?: Item[],
  selectedTitle?: string,
  availableTitle?: string,
  onAdd?: () => void,
  listOutline?: boolean,
  boxOutline?: boolean,
  allowCustom?: boolean,
  customTitle?: string,
  onChange?: (draft: string) => void,
}

/**
 * Each AddRemove manages two List components, allowing a user to add and remove
 * things between them, with pending states, custom items, and user confirmation.
 */
const AddRemove = ({
  name,
  initialSelectedItems,
  initialAvailableItems,
  selectedTitle,
  availableTitle,
  listOutline,
  boxOutline,
  allowCustom = false,
  customTitle,
  onChange,
  ...props
}: PropsWithChildren<AddRemoveProps>) => {
  const dispatch = useDispatch()
  const [selectedItems, setSelectedItems] = useState<Item[]>(initialSelectedItems)
  const [availableItems, setAvailableItems] = useState<Item[]>(initialAvailableItems)
  const [pendingAdd, setPendingAdd] = useState<Item[]>([])
  const [pendingDelete, setPendingDelete] = useState<Item[]>([])
  const [customName, setCustomName] = useState('')
  const { lang } = useSelector(settingsSelectors.current)

  /**
   * Marks an item as pending deletion. Actual deletion is handled externally.
   */
  const togglePendingDelete = (value) => {
    if (pendingDelete.find((pending) => pending?.value === value)) {
      setPendingDelete(pendingDelete.filter((pending) => pending?.value !== value))
      return
    }

    const item = selectedItems?.find((candidate) => candidate?.value === value)

    if (item) {
      setPendingDelete([...pendingDelete, item])
    }
  }

  /**
   * Marks an item as pending addition. Actual addition is handled externally.
   */
  const handleAdd = (value) => {
    const item = availableItems?.find((candidate) => candidate?.value === value)

    if (item) {
      setPendingAdd([...pendingAdd, item])
    }
  }

  /**
   * Add a custom item to the list. Guarantees uniqueness.
   */
  const handleAddCustom = () => {
    if (!customName) {
      return
    }

    if (
      selectedItems?.find((item) => item?.value === customName)
      || availableItems?.find((item) => item?.value === customName)
      || pendingAdd.find((item) => item?.value === customName)
      || pendingDelete.find((item) => item?.value === customName)
    ) {
      dispatch(toastActions.addToQueue({
        title: i18n['add-remove.custom.error.duplicate.title'][lang],
        body: i18n['add-remove.custom.error.duplicate.message'][lang],
        ttl: 8000,
        type: 'danger',
      }))
      return
    }

    setPendingAdd([...pendingAdd, { value: customName, name: customName }])
    setCustomName('')
  }

  /**
   * Immediately undo pending addition.
   */
  const handleRemove = (value) => {
    setPendingAdd([...pendingAdd].filter((pending) => pending?.value !== value))
  }

  /**
   * Figures out the controls to show for each item.
   */
  const resolveControls = (item) => {
    const controls = []

    const isSelected = Array.isArray(selectedItems) ? selectedItems.find((selected) => selected?.value === item?.value) : false
    const isAvailable = Array.isArray(availableItems) ? availableItems.find((selected) => selected?.value === item?.value) : false
    const isPendingAdd = pendingAdd.find((pending) => pending?.value === item?.value)

    if (item?.canDelete !== false && isSelected) {
      controls.push('delete')
    }
    if (isPendingAdd) {
      controls.push('remove')
    }
    if (item?.canAdd !== false && isAvailable && !isPendingAdd) {
      controls.push('add')
    }

    return controls
  }

  /**
   * Returns the item's current state.
   */
  const resolveStateKeys = (item) => {
    return {
      ...item,
      ...(!!pendingAdd.find((pending) => pending?.value === item?.value) && { pendingAdd: true }),
      ...(!!pendingDelete.find((pending) => pending?.value === item?.value) && { pendingDelete: true }),
    }
  }

  /**
   * Maps an item onto the shape a List row wants. These items carry their identity in `value`,
   * which is the List's `id`; nothing of theirs belongs in a row's value column.
   */
  const toListItem = (item): ListItem => ({
    ...resolveStateKeys(item),
    id: item?.value,
    label: item?.name,
    value: undefined,
    controls: resolveControls(item),
  })

  /**
   * Removes all keys added by this component.
   */
  const cleanupKeys = (items) => {
    if (!items) {
      return
    }
    items.forEach((item) => {
      delete item.pendingAdd
      delete item.pendingDelete
      delete item.controls
    })
  }

  /**
   * Resolves the state of what would happen if the user pressed save.
   */
  const draftSave = () => {
    if (!Array.isArray(selectedItems)) {
      return '[]'
    }

    // Remove items that are pending deletion
    const draft = [...selectedItems]
      .filter((item) => !pendingDelete.find((pending) => pending?.value === item?.value))

    // Add items that are pending addition
    pendingAdd.forEach((pending) => draft.push({ ...pending }))

    cleanupKeys(draft)

    return JSON.stringify(draft)
  }

  /**
   * When the parent component updates the initial state, that is our signal
   * that the pending changes have been accepted and can be cleaned up.
   */
  useEffect(() => {
    if (
      JSON.stringify(initialSelectedItems) !== JSON.stringify(cleanupKeys(selectedItems))
      || JSON.stringify(initialAvailableItems) !== JSON.stringify(cleanupKeys(availableItems))
    ) {
      setPendingAdd([])
      setPendingDelete([])
      setSelectedItems(initialSelectedItems)
      setAvailableItems(initialAvailableItems)
    }
  }, [initialSelectedItems, initialAvailableItems])

  /**
   * Propagate current state.
   */
  useEffect(() => {
    if (typeof onChange === 'function') {
      onChange(draftSave())
    }
  }, [selectedItems, availableItems, pendingAdd, pendingDelete])

  return (
    <div className={clsx('add-remove', boxOutline && 'box-outline')} {...props}>
      {!!Array.isArray(initialSelectedItems) &&
        <div className="add-remove-add">
          {!!selectedTitle && <p className="add-remove-title">{selectedTitle}</p>}
          <List
            items={selectedItems
              .concat(pendingAdd)
              .map((item) => toListItem(item))
            }
            onRemove={(item) => handleRemove(item?.id)}
            onDelete={(item) => togglePendingDelete(item?.id)}
          />
        </div>
      }
      {!!Array.isArray(initialAvailableItems) &&
        <div className="add-remove-remove">
          {!!availableTitle && <p className="add-remove-title">{availableTitle}</p>}
          <List
            items={availableItems
              .filter((item) => !pendingAdd.find((pending) => pending?.value === item?.value))
              .map((item) => toListItem(item))
            }
            onAdd={(item) => handleAdd(item?.id)}
          />
        </div>
      }
      {!!allowCustom && (
        <div className={clsx('add-remove-custom', listOutline && 'outline')}>
          {!!customTitle && <p className="add-remove-title">{customTitle}</p>}
          <div className="add-remove-custom-name">
            <div className="add-remove-custom-input">
              <TextInput
                name="add-remove-custom-value"
                type="text"
                value={customName}
                onChange={(value) => setCustomName(value)}
                onEnter={handleAddCustom}
              />
            </div>
            <div className="add-remove-custom-submit">
              <Icon
                onClick={handleAddCustom}
                fa="fas fa-plus-circle"
              />
            </div>
          </div>
        </div>
      )}
      <input type="hidden" name={name} value={draftSave()} data-is-json={true} />
    </div>
  )
}

export default AddRemove
