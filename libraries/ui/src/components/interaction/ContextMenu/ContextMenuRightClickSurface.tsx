import { useRef, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'

import ContextMenu from './ContextMenu'

type ContextMenuRightClickSurfaceProps = {
  className?: string,
  disabled?: boolean,
}

/**
 * When the user right clicks, a context menu will be built using all of the
 * layers found stacked in the DOM under the x,y of the click.
 */
const ContextMenuRightClickSurface = ({
  children,
  className,
  disabled,
  ...props
}: PropsWithChildren<ContextMenuRightClickSurfaceProps>) => {
  const domRef = useRef(null)
  const [menuItems, setMenuItems] = useState([])
  const [showMenu, setShowMenu] = useState(false)
  const [posX, setPosX] = useState(10)
  const [posY, setPosY] = useState(10)

  /**
   * Get all parent DOM nodes of the event target that are context menu layers.
   */
  const getParentNodes = (e) => {
    const el = e.target
    const nodes = [el]
    let parent = el.parentElement
    while (parent !== document && parent?.parentElement) {
      nodes.push(parent)
      parent = parent.parentElement
    }
    nodes.push(top)
    return nodes
  }

  /**
   * Build an array of context menu items using the stack found in the DOM nodes
   * based on the right-click location.
   */
  const getMenuItems = (e) => {
    return getParentNodes(e)
      .filter((el) => el?.matches ? el.matches('.context-menu-dom-layer') : false)
      .map((el) => el?._cardinalContextMenuItems)
      .filter((items) => !!items)
      .flatMap((item) => item)
  }

  /**
   * Closes the current right-click menu. Will not close other ContextMenu instances.
   */
  const closeMenu = () => {
    setPosX(10)
    setPosY(10)
    setMenuItems([])
    setShowMenu(false)
  }

  /**
   * Listen for right-clicks on this layer.
   */
  useEffect(() => {
    if (disabled) return
    if (!domRef.current) return

    const contextmenuHandler = (e) => e.preventDefault()
    const clickOutsideToCloseHandler = (e) => {
      if (e.target.closest('.context-menu')) return
      closeMenu()
    }
    const rightClickHandler = (e) => {
      if (e.which !== 3) return
      const menuItems = getMenuItems(e)
      if (menuItems.length) {
        e.preventDefault()
        e.stopPropagation()
        setPosX(e.x)
        setPosY(e.y)
        setMenuItems(menuItems)
        setShowMenu(true)
        document.addEventListener('mousedown', clickOutsideToCloseHandler)
      }
    }

    domRef.current.addEventListener('mousedown', rightClickHandler)
    domRef.current.addEventListener('contextmenu', contextmenuHandler)

    return () => {
      if (domRef.current) {
        domRef.current.removeEventListener('mousedown', rightClickHandler)
        domRef.current.removeEventListener('contextmenu', contextmenuHandler)
      }
      document.removeEventListener('mousedown', clickOutsideToCloseHandler)
    }
  }, [disabled])

  /**
   * Listen for left-clicks on context menu items so we know to close the menu.
   */
  useEffect(() => {
    if (!domRef.current) return

    const leftClickHandler = (e) => {
      if (e.target.matches('.context-menu-group button')) {
        // So... this isn't great, but it's needed to prevent this function call
        // from removing the content menu item so quickly that the item's
        // callback function is removed from memory before it's supposed to run.
        //
        // FIXME: Refactor ContextMenu to use a react portal.
        setTimeout(() => {
          setShowMenu(false)
        }, 0)
      }
    }

    domRef.current.addEventListener('click', leftClickHandler)

    return () => {
      if (domRef.current) {
        domRef.current.removeEventListener('click', leftClickHandler)
      }
    }
  }, [])

  /**
   * Ensure that the ContextMenu stays within the bounds of the viewport.
   */
  useEffect(() => {
    if (showMenu) {
      const menuBoundingBox = document.querySelector('.context-menu').getBoundingClientRect()

      if (menuBoundingBox.bottom > window.innerHeight) {
        setPosY(window.innerHeight - menuBoundingBox.height)
      }

      if (menuBoundingBox.right > window.innerWidth) {
        setPosX(window.innerWidth - menuBoundingBox.width)
      }
    }
  })

  return (
    <div className={`context-menu-right-click-surface ${className}`} {...props} ref={domRef}>
      {!!showMenu && <ContextMenu items={menuItems} x={posX} y={posY} />}
      {children}
    </div>
  )
}

export default ContextMenuRightClickSurface
