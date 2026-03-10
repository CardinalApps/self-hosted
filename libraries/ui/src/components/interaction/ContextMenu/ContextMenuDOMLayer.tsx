import { useRef, useEffect } from 'react'
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'

import './ContextMenu.css'

export type MenuItem = {
  label?: string,
  onClick?: () => void,
  render?: () => ReactNode,
}

export type MenuItemGroup = {
  groupName?: string,
  items: MenuItem[],
}

export type ContextMenuDOMLayerProps = {
  items?: MenuItemGroup | Array<MenuItemGroup>,
  className?: string,
  style?: CSSProperties,
}

/**
 * Saves menu items directly in the DOM.
 *
 * @param {Element} items - Menu items that this layer inserts into the context
 * menu.
 */
const ContextMenuDOMLayer = ({
  items,
  className,
  children,
  ...props
}: PropsWithChildren<ContextMenuDOMLayerProps>) => {
  const domRef = useRef(null)

  /**
   * Attach this layer's menu items to a node in the DOM.
   *
   * We must use the DOM node itself because function references would be lost
   * during serialization with a data-* attribute.
   */
  useEffect(() => {
    if (domRef.current) {
      domRef.current._cardinalContextMenuItems = items
    }
  }, [])

  return (
    <div className={`context-menu-dom-layer ${className}`} {...props} ref={domRef}>
      {children}
    </div>
  )
}

export default ContextMenuDOMLayer
