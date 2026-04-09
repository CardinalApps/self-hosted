import { useEffect, useState } from 'react'
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import clsx from 'clsx'
import { MediaServerCapability } from '@cardinalapps/access-control/src'

import {
  layoutActions,
  layoutSelectors,
  PAGE_LAYOUT,
  PAGE_BEHAVIORS,
  SIDEBAR_MODE,
} from '../../../store/slices/layout'
import HasCapabilities from '../../layout/HasCapabilities'
import AccessError, { NetworkError } from '../../layout/AccessError/AccessError'
import useScrollPointRestoration from '../../../hooks/useScrollPointRestoration'
import { createPortal } from 'react-dom'

type AppPageProps = {
  layout?: string,
  pageTitle?: string,
  pageDocLink?: string,
  className?: string | string[],
  capabilities?: MediaServerCapability[],
  loading?: boolean,
  restoreScrollPoint?: boolean,
  toolbar?: ReactNode,
  toolbarPortal?: boolean,
  showLibrarySwitcher?: boolean,
  networkError?: NetworkError,
  virtualLayout?: ReactNode,
  style?: CSSProperties,
  children?: ReactNode,
}

/**
 * All scaffold pages in the app should be wrapped with this.
 */
function AppPage({
  layout = PAGE_LAYOUT.standard,
  pageTitle,
  pageDocLink,
  className = [],
  capabilities,
  loading = false,
  children,
  restoreScrollPoint = true,
  toolbar,
  toolbarPortal,
  showLibrarySwitcher = false,
  networkError,
  style,
  ...props
}: PropsWithChildren<AppPageProps>) {
  useScrollPointRestoration('.main-col', !restoreScrollPoint)
  const dispatch = useDispatch()
  const [toolbarPortalIsReady, setToolbarPortalIsReady] = useState(false)
  const userSelectedSidebarMode = useSelector(layoutSelectors.userSelectedSidebarMode)
  const sidebarMode = useSelector(layoutSelectors.sidebarMode)
  const sidebarIsCollapsed = sidebarMode === SIDEBAR_MODE.collapsed

  /**
   * Renders the toolbar, either as a regular page item or within the toolbar
   * portal.
   */
  const renderToolbar = () => {
    // If toolbarPortal is undefined, set it automatically based on the current
    // page layout
    const usingToolbarPortal = typeof toolbarPortal === 'undefined'
      ? layout === PAGE_LAYOUT.virtual
      : toolbarPortal

    if (usingToolbarPortal) {
      const el = document.querySelector('#toolbar-portal')
      if (el) {
        return createPortal(toolbar, el)
      } else {
        return null
      }
    } else {
      return (
        <div className="page-toolbar">
          {toolbar}
        </div>
      )
    }
  }

  /**
   * App layout can change when the page changes.
   */
  useEffect(() => {
    dispatch(layoutActions.setLayout(layout as PAGE_LAYOUT))
    dispatch(layoutActions.setPageTitle(pageTitle))
    dispatch(layoutActions.setPageDocLink(pageDocLink))
    dispatch(layoutActions.setShowLibrarySwitcher(showLibrarySwitcher))

    // Maybe force close the sidebar
    if (PAGE_BEHAVIORS[layout].forceSidebarCollapse) {
      dispatch(layoutActions.setSidebarMode(SIDEBAR_MODE.collapsed))
    }

    // Maybe automatically reopen the sidebar
    if (!PAGE_BEHAVIORS[layout].forceSidebarCollapse && userSelectedSidebarMode === SIDEBAR_MODE.expanded) {
      dispatch(layoutActions.setSidebarMode(SIDEBAR_MODE.expanded))
    }
  }, [layout, pageTitle, pageDocLink, showLibrarySwitcher])

  useEffect(() => {
    if (document.querySelector('#toolbar-portal')) {
      setToolbarPortalIsReady(true)
    }
  }, [document.querySelector('#toolbar-portal')])

  return (
    <div
      {...props}
      style={style}
      className={clsx('app-page', className, sidebarIsCollapsed && 'sidebar-is-collapsed', loading && 'loading')}
    >
      {
        networkError
          // All page-level errors, like 404's for dynamic routes
          ? <AccessError networkError={networkError} />
          : <>
              {!!toolbar && toolbarPortalIsReady && renderToolbar()}
              <HasCapabilities capabilities={capabilities}>
                {children}
              </HasCapabilities>
            </>
      }
    </div>
  )
}

export default AppPage
