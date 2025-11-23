import type { PropsWithChildren, ReactNode } from 'react'
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
  name: string | ReactNode,
  title?: string,
  value?: string,
  label?: string | React.ReactNode,
  truncateLabel?: boolean,
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
                    !!item?.pendingAdd && 'pending-add',
                    !!item?.pendingDelete && 'pending-delete',
                  )}
                  key={item?.value || index}
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
                  <span className="item-list-item-name" title={item?.title}>{item?.name}</span>
                  {typeof item?.label === 'string'
                    ? <span className={clsx('item-list-item-label', item?.truncateLabel && 'truncate')} title={item?.title}>{item?.label}</span>
                    : <span className={clsx('item-list-item-label', item?.truncateLabel && 'truncate')}>{item?.label || null}</span>
                  }
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
