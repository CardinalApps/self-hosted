import { useState, useEffect } from 'react'
import type { PropsWithChildren } from 'react'

import type { MenuItemGroup } from './ContextMenuDOMLayer'

import './ContextMenu.css'

type ContextMenuProps = {
  items: MenuItemGroup | MenuItemGroup[],
  x?: number,
  y?: number,
}

/**
 * A context menu meant to be shown on right click or maybe after a button
 * click.
 *
 * @param {Array} items - An array of menu items. Overrides the generated menu
 * from onElement if both props are given.
 * @param {Number} x - The desired top-left X coordinate on the page. Will
 * automatically be adjusted if it doesn't leave enough room to open the menu.
 * @param {Number} y - The desired top-left Y coordinate on the page. Will
 * automatically be adjusted if it doesn't leave enough room to open the menu.
 */
const ContextMenu = ({
  items,
  x,
  y,
}: PropsWithChildren<ContextMenuProps>) => {
  const [showGroupLabels, setShowGroupLabels] = useState(false)

  if (!Array.isArray(items)) {
    items = [items]
  }

  const handleMenuItemClick = (menuItem) => {
    if (menuItem?.onClick) {
      menuItem.onClick()
    }
  }

  /**
   * Show the group labels while the control key is held down.
   */
  useEffect(() => {
    const onCmdOrCtrlDown = (e) => {
      if (e.key === 'Control') {
        setShowGroupLabels(true)
      }
    }
    const onCmdOrCtrlUp = (e) => {
      if (e.key === 'Control') {
        setShowGroupLabels(false)
      }
    }

    window.addEventListener('keydown', onCmdOrCtrlDown)
    window.addEventListener('keyup', onCmdOrCtrlUp)

    return () => {
      window.removeEventListener('keydown', onCmdOrCtrlDown)
      window.removeEventListener('keyup', onCmdOrCtrlUp)
    }
  }, [])

  return (
    <div className="context-menu" style={{ top: y, left: x }}>
      {items.map((itemGroup, index) => {
        return (
          <div key={itemGroup?.groupName || index} className="context-menu-group">
            {showGroupLabels && itemGroup?.groupName && <p className="context-menu-group-name">{itemGroup.groupName}</p>}
            {!!itemGroup?.items?.length && (
              <ol>
                {itemGroup.items.map((menuItem, index) => {
                  return (
                    <li
                      key={menuItem?.label || index}
                      onClick={menuItem?.onClick ? () => handleMenuItemClick(menuItem) : undefined}
                    >
                      <button type="button">{menuItem?.render ? menuItem.render() : menuItem?.label}</button>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ContextMenu
