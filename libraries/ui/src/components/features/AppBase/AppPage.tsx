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
import { settingsSelectors } from '../../../store/slices/settings'
import H1 from '../../typography/H1'
import HasCapabilities from '../../layout/HasCapabilities'
import AccessError, { NetworkError } from '../../layout/AccessError/AccessError'
import CrashError from '../../layout/CrashError'
import AnimatedGradient from '../../layout/AnimatedGradient'
import { ErrorBoundary } from '../../../lib/react-error-boundary'
import useScrollPointRestoration from '../../../hooks/useScrollPointRestoration'
import { createPortal } from 'react-dom'

/*
  Layouts that name the page in the page flow on a phone, where the header has no room for a
  title. Opt in per layout: some, like the Photos map, fill the viewport and have nowhere to put it.
*/
const MOBILE_TITLE_LAYOUTS: string[] = [
  PAGE_LAYOUT.standard,
]

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
  // Overrides the layout's default for the in-flow mobile page title
  showMobileTitle?: boolean,
  networkError?: NetworkError,
  virtualLayout?: ReactNode,
  style?: CSSProperties,
  children?: ReactNode,
  animatedGradientColors?: string[],
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
  toolbarPortal = true,
  showLibrarySwitcher = false,
  showMobileTitle,
  networkError,
  style,
  animatedGradientColors,
  ...props
}: PropsWithChildren<AppPageProps>) {
  useScrollPointRestoration('.main-col', !restoreScrollPoint)
  const dispatch = useDispatch()
  const [toolbarPortalIsReady, setToolbarPortalIsReady] = useState(() => !!document.querySelector('#toolbar-portal'))
  const userSelectedSidebarMode = useSelector(layoutSelectors.userSelectedSidebarMode)
  const sidebarMode = useSelector(layoutSelectors.sidebarMode)
  const sidebarIsCollapsed = sidebarMode === SIDEBAR_MODE.collapsed
  const { enable_glass } = useSelector(settingsSelectors.current)

  /*
    Mounting AnimatedGradient before colors are sampled would hand it an empty values
    array; when the real colors arrive a moment later it treats that as going from 0
    blotches to N and grows each one from size 0. Waiting for colors first means it always
    mounts at full size, and the fade-in below is a plain opacity transition instead.
  */
  const [gradientVisible, setGradientVisible] = useState(false)
  useEffect(() => {
    if (!animatedGradientColors?.length) {
      setGradientVisible(false)
      return
    }
    const raf = requestAnimationFrame(() => setGradientVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [animatedGradientColors])

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
      {!!enable_glass && !!animatedGradientColors?.length && document.querySelector('#app-background-portal') &&
        createPortal(
          <AnimatedGradient
            values={animatedGradientColors}
            className={clsx('app-page-background', gradientVisible && 'visible')}
            sizeMin={40}
            sizeMax={80}
          />,
          document.querySelector('#app-background-portal'),
        )
      }
      {/* Render errors in the page swap it for the crash screen; the app scaffold stays alive */}
      <ErrorBoundary fallback={<CrashError />}>
        {
          networkError
            // All page-level errors, like 404's for dynamic routes
            ? <AccessError networkError={networkError} />
            : <>
                {!!toolbar && toolbarPortalIsReady && renderToolbar()}
                {!!pageTitle && (showMobileTitle ?? MOBILE_TITLE_LAYOUTS.includes(layout)) &&
                  <H1 className="app-page-title">{pageTitle}</H1>
                }
                <HasCapabilities capabilities={capabilities}>
                  {children}
                </HasCapabilities>
              </>
        }
      </ErrorBoundary>
    </div>
  )
}

export default AppPage
