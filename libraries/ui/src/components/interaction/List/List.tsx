import type { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import { useAppDispatch } from '../../../hooks/useAppDispatch'
import Icon from '../../typography/Icon'
import Avatar from '../../layout/Avatar'

import { settingsSelectors } from '../../../store/slices/settings'
import { copyToClipboard } from '../../../lib/clipboard/copy'
import { toastActions } from '../../../store/slices/toast'

import i18n from './i18n'

import './List.css'

export type ListItemControls = 'add' | 'remove' | 'delete' | 'copy' | 'view'
export type ListItem = {
  label: string | ReactNode,
  value?: string | ReactNode,
  id?: string,
  title?: string,
  truncateValue?: boolean,
  avatar?: {
    type: 'image',
    image: string,
  },
  icon?: {
    fa: string,
  },
  copyable?: string,
  controls?: ListItemControls[],
  pendingAdd?: boolean,
  pendingDelete?: boolean,
  onView?: (item: ListItem) => void,
  onAdd?: (item: ListItem) => void,
  onRemove?: (item: ListItem) => void,
  onDelete?: (item: ListItem) => void,
}

type ListProps = {
  name?: string,
  className?: string,
  items: ListItem[],
  controls?: unknown[],
  layout?: 'default' | 'compact'
  maxHeight?: number,
  onView?: (item: ListItem) => void,
  onAdd?: (item: ListItem) => void,
  onRemove?: (item: ListItem) => void,
  onDelete?: (item: ListItem) => void,
}

// A row that fills its value column divides its width differently than a row that doesn't
const hasValue = (item: ListItem) => item?.value !== undefined && item?.value !== null && item?.value !== ''

/* A plain string value is truncated on sight, since a long one would otherwise wrap into a
   second line the key never asked for. Anything richer opts in. */
const truncateValue = (item: ListItem) => item?.truncateValue ?? typeof item?.value === 'string'

// Nothing is hidden by that truncation: the full string is always readable on hover
const valueTitle = (item: ListItem) => item?.title
  ?? (typeof item?.value === 'string' ? item.value : undefined)

/**
 * List.
 */
const List = ({
  name,
  className,
  items = [],
  controls = [],
  layout = 'default',
  maxHeight,
  onView,
  onAdd,
  onRemove,
  onDelete,
  ...props
}: ListProps) => {
  const dispatch = useAppDispatch()
  const { lang } = useSelector(settingsSelectors.current)

  const handleOnView = (item) => {
    if (typeof onView === 'function') {
      onView(item)
    }
    if (typeof item?.onView === 'function') {
      item.onView(item)
    }
  }

  const handleOnAdd = (item) => {
    if (typeof onAdd === 'function') {
      onAdd(item)
    }
    if (typeof item?.onAdd === 'function') {
      item.onAdd(item)
    }
  }

  const handleOnRemove = (item) => {
    if (typeof onRemove === 'function') {
      onRemove(item)
    }
    if (typeof item?.onRemove === 'function') {
      item.onRemove(item)
    }
  }

  const handleOnDelete = (item) => {
    if (typeof onDelete === 'function') {
      onDelete(item)
    }
    if (typeof item?.onDelete === 'function') {
      item.onDelete(item)
    }
  }

  const handleCopy = (copyable) => {
    if (!copyable) {
      return console.warn('Missing "copyable" prop on List')
    }
    copyToClipboard(copyable)
    dispatch(toastActions.addToQueue({
      type: 'success',
      title: i18n['list.copied'][lang],
      body: copyable,
      ttl: 5000,
    }))
  }

  return (
    <div {...props} className={clsx('item-list', className)} data-name={name} data-layout={layout}>
      {items.length
        ? <ul style={{ maxHeight }}>
            {items.map((item, index) => {
              const controlsToUse = item?.controls
                ? item.controls
                : controls
              return (
                <li
                  className={clsx(
                    hasValue(item) && 'has-value',
                    !!item?.pendingAdd && 'pending-add',
                    !!item?.pendingDelete && 'pending-delete',
                  )}
                  key={item?.id || index}
                >
                  {!!item?.avatar && (
                    <span className="item-list-item-avatar">
                      <Avatar size="s" {...item.avatar} />
                    </span>
                  )}
                  {!!item?.icon && (
                    <span className="item-list-item-icon">
                      <Icon {...item.icon} />
                    </span>
                  )}
                  <span className="item-list-item-label" title={item?.title}>{item?.label}</span>
                  <span
                    className={clsx('item-list-item-value', truncateValue(item) && 'truncate')}
                    title={valueTitle(item)}
                  >
                    {item?.value ?? null}
                  </span>
                  {!!controlsToUse?.length && (
                    <span className="item-list-item-controls">
                      {!!controlsToUse.includes('view') && <Icon fa="fas fa-eye" onClick={() => handleOnView(item)} />}
                      {!!controlsToUse.includes('add') && <Icon fa="fas fa-plus" onClick={() => handleOnAdd(item)} />}
                      {!!controlsToUse.includes('copy') && <Icon fa="fas fa-copy" onClick={() => handleCopy(item?.copyable)} />}
                      {!!controlsToUse.includes('remove') && <Icon fa="fas fa-minus" onClick={() => handleOnRemove(item)} />}
                      {!!controlsToUse.includes('delete') && <Icon fa="fas fa-trash-alt" onClick={() => handleOnDelete(item)} />}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        : <div className="item-list-empty">{i18n['list.empty'][lang]}</div>
      }
    </div>
  )
}

export default List
