import { useContext, useEffect } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useSelector } from 'react-redux'

import AppLogin from './AppLogin'
import AppScaffold from './AppScaffold'
import type { SidebarOptions } from './AppScaffold'

import { settingsSelectors } from '../../../store/slices/settings'

import { routes } from './routes'
import { RouterContext, RouterContextType } from '../../../context/router'

type AppPrivateProps = {
  header: ReactNode,
  sidebarOptions: SidebarOptions,
  privateRoutes: ReactNode,
  publicRoutes: ReactNode,
  privateScaffoldRoutes: ReactNode,
  loginWithCardinalButton: ReactNode,
  enableGlobalAudioPlayer: boolean,
}

/**
 * This part of the component tree is only accessible after logging into a Home
 * Server account.
 */
function AppPrivate({
  header,
  sidebarOptions,
  privateRoutes,
  publicRoutes,
  privateScaffoldRoutes,
  loginWithCardinalButton,
  enableGlobalAudioPlayer,
}: PropsWithChildren<AppPrivateProps>) {
  const { Routes, Route, navigate } = useContext<RouterContextType>(RouterContext)
  const { startPage } = useSelector(settingsSelectors.current)

  /**
   * Automatically redirect to the user's custom start page.
   */
  useEffect(() => {
    if (startPage && !window.location.href.includes(startPage as string)) {
      navigate(startPage as string)
    }
  }, [])

  return (
    <Routes>
      {privateRoutes ? privateRoutes : null}
      {publicRoutes ? publicRoutes : null}
      <Route path={routes.LOGIN} element={<AppLogin loginWithCardinalButton={loginWithCardinalButton} />} />
      <Route
        path="*"
        element={
          <AppScaffold
            header={header}
            sidebarOptions={sidebarOptions}
            privateScaffoldRoutes={privateScaffoldRoutes}
            enableGlobalAudioPlayer={enableGlobalAudioPlayer}
          />
        }
      />
    </Routes>
  )
}

export default AppPrivate
