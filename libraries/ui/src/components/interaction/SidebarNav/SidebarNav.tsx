import { useEffect, useRef } from 'react'
import type { CSSProperties, PropsWithChildren } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import clsx from 'clsx'

import {
  layoutSelectors,
  layoutActions,
  PAGE_BEHAVIORS,
  SIDEBAR_MODE,
} from '../../../store/slices/layout'

import './SidebarNav.css'

type SidebarNavProps = {
  className?: string,
  size?: 'thin' | 'regular',
  showCollapseButton?: boolean,
  overrideAppLayout?: string,
  overrideIsCollapsed?: boolean,
  overflow?: boolean,
  style?: CSSProperties,
}

const SidebarNav = ({
  children = <></>,
  className = '',
  size = 'regular',
  showCollapseButton,
  overrideAppLayout,
  overrideIsCollapsed,
  overflow = false,
  style,
}: PropsWithChildren<SidebarNavProps>) => {
  const ulRef = useRef(null)
  const dispatch = useDispatch()
  const layout = useSelector(layoutSelectors.current)
  const mobileNavIsOpen = useSelector(layoutSelectors.mobileNavIsOpen)
  const sidebarMode = useSelector(layoutSelectors.sidebarMode)
  const isCollapsed = sidebarMode === SIDEBAR_MODE.collapsed

  /**
   * Logic for determining the current layout to use.
   */
  const resolveLayout = () => {
    if (overrideAppLayout) {
      return overrideAppLayout
    } else {
      return layout
    }
  }

  /**
   * Logic for determining if we should show the collapse/expand button.
   */
  const resolveShowCollapseButton = () => {
    if (showCollapseButton !== undefined) {
      return showCollapseButton
    } else {
      return PAGE_BEHAVIORS[resolveLayout()]?.showCollapseControl
    }
  }

  /**
   * Logic for determining if the menu should be expanded or collapsed.
   */
  const resolveIsCollapsed = () => {
    if (overrideIsCollapsed !== undefined) {
      return overrideIsCollapsed
    }
    if (PAGE_BEHAVIORS[resolveLayout()]?.forceSidebarCollapse) {
      return true
    } else {
      return isCollapsed
    }
  }

  /**
   * Should the nav have a background?
   */
  const hasBackground = () => {
    return PAGE_BEHAVIORS[resolveLayout()]?.showBackground
  }

  /**
   * When a menu item is clicked.
   */
  const handleLinkClick = (e) => {
    if (!e.target.closest('a')) {
      e.stopPropagation()
    }
    dispatch(layoutActions.setMobileNavIsOpen(false))
  }

  /**
   * Expand a single menu item label from its collapsed position.
   */
  const expandLabel = (e) => {
    const li = e.target.closest('li')

    if (!li) {
      return
    }

    if (sidebarMode === SIDEBAR_MODE.collapsed && !li.classList.contains('expand-label')) {
      e.stopPropagation()
      const anchor = li.querySelector('a')

      if (!anchor) {
        return
      }

      const spanWidth = li.querySelector('span')?.clientWidth || 0
      const otherLi = Array.from(e.target.closest('ul').querySelectorAll('li')).filter((el) => el !== li)
      li.classList.add('expand-label')
      anchor.style.width = `${spanWidth + 90}px`
      otherLi.forEach((el) => collapseLabel(el))
    }
  }

  /**
   * Collapse a single menu item label from its expanded position.
   */
  const collapseLabel = (el) => {
    el.classList.remove('expand-label')
    const anchor = el.querySelector('a')
    if (anchor?.style) {
      anchor.style.removeProperty('width')
    }
  }

  /**
   * Collapse all menu items labels from their expanded postions.
   */
  const collapseAllLabels = () => {
    if (ulRef.current) {
      Array.from(ulRef.current.querySelectorAll('li')).forEach((el) => collapseLabel(el))
    }
  }

  /**
   * When the user clicks the collapse/expand icon.
   */
  const handleCollapseClick = () => {
    const nextState = !isCollapsed === true
      ? SIDEBAR_MODE.collapsed
      : SIDEBAR_MODE.expanded
    dispatch(layoutActions.setUserSelectedSidebarMode(nextState))
    dispatch(layoutActions.setSidebarMode(nextState))
  }

  useEffect(() => {
    if (sidebarMode === SIDEBAR_MODE.expanded) {
      collapseAllLabels()
    }
  }, [sidebarMode])

  return (
    <>
      <div className={`sidebar-nav-mobile-overlay ${mobileNavIsOpen ? 'mobile-open' : ''}`} />
      <nav
        className={clsx(
          'sidebar-nav',
          size,
          className,
          mobileNavIsOpen ? 'mobile-open' : '',
          overflow ? 'overflow-enabled' : '',
          hasBackground() ? 'show-bg' : '',
          resolveIsCollapsed() ? 'collapsed' : 'expanded',
        )}
        onClick={() => dispatch(layoutActions.setMobileNavIsOpen(false))}
        style={style}
      >
        <ul
          className="sidebar-list"
          ref={ulRef}
          onClick={(e) => handleLinkClick(e)}
          onMouseMove={(e) => expandLabel(e)}
          onFocus={(e) => expandLabel(e)}
          onMouseLeave={() => collapseAllLabels()}
          onBlur={() => collapseAllLabels()}
        >
          {children}
        </ul>
        <div className={`sidebar-nav-buttons ${resolveIsCollapsed() ? 'collapsed' : 'expanded'}`}>
          {resolveShowCollapseButton() &&
            <button
              className={`toggle-collapse ${resolveIsCollapsed() ? 'collapsed' : 'expanded'}`}
              onClick={() => handleCollapseClick()}
            >
              <i className="fas fa-compress-alt collapse" />
              <i className="fas fa-expand-alt expand" />
            </button>
          }
        </div>
      </nav>
      <button
        className={`toggle-mobile-nav ${mobileNavIsOpen ? 'mobile-open' : ''}`}
        type="button"
        onClick={() => dispatch(layoutActions.setMobileNavIsOpen(!mobileNavIsOpen))}
      >
        <i className="when-closed fas fa-bars" />
        <i className="when-open fas fa-long-arrow-alt-down"></i>
      </button>
    </>
  )
}

export default SidebarNav
