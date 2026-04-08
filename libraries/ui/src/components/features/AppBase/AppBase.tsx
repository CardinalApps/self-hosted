import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { RouterContext, RouterContextType } from '../../../context/router'
import clsx from 'clsx'

import {
  ContextMenuRightClickSurface,
  ContextMenuDOMLayer,
} from '../../interaction/ContextMenu'
import { Toaster } from '../../interaction/Toast'
import { MenuItemGroup } from '../../interaction/ContextMenu/ContextMenuDOMLayer'
import { ModalLayer } from '../../layout/Modal'
import { DrawerLayer } from '../../layout/Drawer'
import PhotoViewerLayer from '../PhotoViewer/PhotoViewerLayer'
import
{
  registerHomeServerAPIMiddleware,
  removeHomeServerAPIMiddleware,
} from '../../../lib/homeserver/homeServerAPI'
import handle401 from './middleware/handle401'
import handle410 from './middleware/handle410'

import AppHeader from '../AppHeader'

import AppLoading from './AppLoading'
import AppPrivate from './AppPrivate'
import AppPublic from './AppPublic'
import type { SidebarOptions } from './AppScaffold'
import DevTools from './DevTools'

import { globalActions } from '../../../store/constants/actions'
import healthCheck from '../../../store/slices/homeServer/thunks/healthCheck'
import reloadHomeServerUser from '../../../store/slices/homeServerUser/thunks/reload'
import { appSelectors, appActions } from '../../../store/slices/app'
import { layoutSelectors, layoutActions } from '../../../store/slices/layout'
import { homeServerSelectors, homeServerActions } from '../../../store/slices/homeServer'
import { homeServerUserSelectors } from '../../../store/slices/homeServerUser'
import { toastActions } from '../../../store/slices/toast'
import { settingsSelectors } from '../../../store/slices/settings'
import syncSettings from '../../../store/slices/settings/thunks/sync'
import { useGetInstanceQuery } from '../../../store/apis/instance'

import useServerSideEvents from '../../../hooks/useServerSideEvents'
import useHowler from '../../../hooks/useHowler'

import { getJWT, JWT_TYPE } from '../../../lib/auth/jwt'
import { CardinalApp } from '../../../lib/env/cardinal'

import { routes } from './routes'

import i18n from './i18n'

import './AppBase.css'

type AppBaseProps = {
  app: CardinalApp,
  id?: string,
  name?: string,
  version?: string,
  router: RouterContextType,
  cardinalAppId?: string,
  authStorage?: 'localStorage' | 'sessionStorage',
  onLoginSuccess?: () => void,
  initialDeveloperMode?: boolean,
  basePath?: string,
  topLevelContextMenuItems?: MenuItemGroup[],
  onHomeServerRequiresFirstTimeSetup?: () => void,
  header?: ReactNode,
  sidebarOptions?: SidebarOptions,
  enableGlobalAudioPlayer?: boolean,
  settingsPanel?: ReactNode,
  publicRoutes?: ReactNode,
  privateRoutes?: ReactNode,
  privateScaffoldRoutes?: ReactNode,
  ssoButton?: ReactNode,
}

/**
 * The AppBase is the foundation for all Cardinal web apps that are served by
 * the Media Server. It handles initialization, authentication, server health
 * checks, layout scaffolding, and much more.
 */
function AppBase({
  app,
  id,
  name,
  version,
  router,
  cardinalAppId,
  //authStorage = 'localStorage',
  initialDeveloperMode = false,
  basePath = '',
  topLevelContextMenuItems,
  onHomeServerRequiresFirstTimeSetup = () => console.log('a'),
  //onHomeServerRequiresFirstTimeSetup = () => window.location.href = window.location.origin + AppBasePaths[CardinalApp.ADMIN],
  header,
  sidebarOptions,
  enableGlobalAudioPlayer,
  settingsPanel,
  publicRoutes,
  privateRoutes,
  privateScaffoldRoutes,
  ssoButton,
}: AppBaseProps) {
  useServerSideEvents()
  useHowler()
  const dispatch = useAppDispatch()
  const { navigate, location } = router
  const appRef = useRef(null)
  const sidebarMode = useSelector(layoutSelectors.sidebarMode)
  const mobileNavIsOpen = useSelector(layoutSelectors.mobileNavIsOpen)
  const appVersionInStore = useSelector(appSelectors.version)
  const health = useSelector(homeServerSelectors.health)
  const latestHealthResponse = useSelector(homeServerSelectors.latestHealthResponse)
  const firstTimeSetupComplete = useSelector(homeServerSelectors.firstTimeSetupComplete)
  const homeServerUserLoggedIn = useSelector(homeServerUserSelectors.loggedIn)
  const {
    accent_color,
    theme,
    lang,
    enable_custom_context_menu,
    developer_mode = initialDeveloperMode,
  } = useSelector(settingsSelectors.current)

  const instanceQuery = useGetInstanceQuery()
  const { data: instanceData } = instanceQuery

  const defaultHeader = (
    <AppHeader
      onSwitchAccountClick={() => navigate(routes.LOGIN)}
      loginButton={ssoButton}
    />
  )

  /**
   * Register Media Server API middleware with the app.
   */
  useEffect(() => {
    registerHomeServerAPIMiddleware('handle_401', (...args) => handle401(args[0], args[1], args[2], args[3], dispatch, lang))
    registerHomeServerAPIMiddleware('handle_410', (...args) => handle410(args[0], args[1], args[2], args[3], dispatch, lang))
    return () => {
      removeHomeServerAPIMiddleware('handle_401')
      removeHomeServerAPIMiddleware('handle_410')
    }
  }, [])

  /**
   * Ensure that the local storage state is valid.
   */
  useEffect(() => {
    // If the store contains a user object, we must be holding a token.
    if (homeServerUserLoggedIn && !getJWT(JWT_TYPE.HOME_SERVER_USER)) {
      console.warn('Invalid local state, app has been reset.')
      dispatch({ type: globalActions.RESET })
    }
  }, [location.pathname])

  /**
   * Perform regular health checks.
   */
  useEffect(() => {
    // On app init, when there is no known health status
    if (!health) {
      dispatch(healthCheck())
    }
    // Every time we load the login page
    if (location.pathname === routes.LOGIN) {
      dispatch(healthCheck())
    }
    // Every x seconds
    const heartbeat = setInterval(() => dispatch(healthCheck()), 5000)
    return () => clearInterval(heartbeat)
  }, [location])

  /**
   * On app init, perform a settings sync.
   */
  useEffect(() => {
    if (homeServerUserLoggedIn && firstTimeSetupComplete) {
      dispatch(syncSettings(app))
    }
  }, [homeServerUserLoggedIn])

  /**
   * Clear all old scroll restoration points on app startup.
   */
  useEffect(() => {
    dispatch(layoutActions.removeAllScrollPoints())
  }, [])

  /**
   * Handle changes to the home server health.
   */
  useEffect(() => {
    if (health === 'normal') {
      dispatch(homeServerActions.setFirstTimeSetupComplete(true))
    } else if (health === 'not_setup') {
      dispatch(homeServerActions.setFirstTimeSetupComplete(false))
      onHomeServerRequiresFirstTimeSetup?.()
    } else if (health === 'error') {
      dispatch(toastActions.addToQueue({
        type: 'danger',
        title: i18n['health.network-error.title'][lang],
        body: i18n['health.network-error.body'][lang].replace('{error}', latestHealthResponse?.response ? `<p>${latestHealthResponse?.response}</p>` : ''),
        ttl: 5000,
      }))
    }
  }, [health])

  /**
   * Re-fetch to validate the local user token on app init.
   */
  useEffect(() => {
    if (homeServerUserLoggedIn) {
      dispatch(reloadHomeServerUser())
    }
  }, [homeServerUserLoggedIn])

  /**
   * Apply the user's custom accent color.
   */
  useEffect(() => {
    if (accent_color && appRef.current) {
      appRef.current.style.setProperty("--accent-color", accent_color)
    }
  }, [accent_color])

  /**
   * Sync some props to the store.
   */
  useEffect(() => { dispatch(appActions.setCardinalApp(app)) }, [app])
  useEffect(() => { dispatch(appActions.setCardinalAppId(cardinalAppId)) }, [cardinalAppId])
  useEffect(() => { dispatch(appActions.setBasePath(basePath)) }, [basePath])
  useEffect(() => { dispatch(appActions.setAppName(name)) }, [name])

  /**
   * Kiosk mode is set server side.
   */
  useEffect(() => {
    if (instanceData?.kioskMode !== undefined) {
      dispatch(appActions.setKioskMode(instanceData.kioskMode))
    }
  }, [instanceData?.kioskMode])

  /**
   * Set the app verison in the store on first startup.
   */
  useEffect(() => {
    if (!appVersionInStore) {
      dispatch(appActions.setVersion(version))
    }
  }, [version])

  return (
    <RouterContext.Provider value={router}>
      <div
        ref={appRef}
        id={id}
        className={clsx('app-base')}
        data-theme={theme}
        data-path={location.pathname}
        data-sidebar-mode={sidebarMode}
        data-mobile-nav-open={mobileNavIsOpen}
      >
        <ContextMenuRightClickSurface disabled={!enable_custom_context_menu}>
          <ContextMenuDOMLayer className="base-context-menu-layer" items={topLevelContextMenuItems}>
            <>
              <Toaster className="toaster" />
              <ModalLayer />
              <PhotoViewerLayer />
              <DrawerLayer />
              {!!developer_mode && <DevTools />}
              {health
                ? homeServerUserLoggedIn
                  ? <AppPrivate
                      header={header || defaultHeader}
                      sidebarOptions={sidebarOptions}
                      settingsPanel={settingsPanel}
                      privateRoutes={privateRoutes}
                      publicRoutes={publicRoutes}
                      privateScaffoldRoutes={privateScaffoldRoutes}
                      loginWithCardinalButton={ssoButton}
                      enableGlobalAudioPlayer={enableGlobalAudioPlayer}
                    />
                  : <AppPublic
                      publicRoutes={publicRoutes}
                      loginWithCardinalButton={ssoButton}
                    />
                : <AppLoading />
              }
            </>
          </ContextMenuDOMLayer>
        </ContextMenuRightClickSurface>
      </div>
    </RouterContext.Provider>
  )
}

export default AppBase
