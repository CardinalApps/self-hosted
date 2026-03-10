import { useContext, useEffect } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { motion, Transition, Variants } from 'framer-motion'

import AppLogin from './AppLogin'
import AppScaffold from './AppScaffold'
import type { SidebarOptions } from './AppScaffold'

import { settingsSelectors } from '../../../store/slices/settings'

import { routes } from './routes'
import { RouterContext, RouterContextType } from '../../../context/router'

type AppPrivateProps = {
  header: ReactNode,
  sidebarOptions: SidebarOptions,
  settingsPanel: ReactNode,
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
  settingsPanel,
  privateRoutes,
  publicRoutes,
  privateScaffoldRoutes,
  loginWithCardinalButton,
  enableGlobalAudioPlayer,
}: PropsWithChildren<AppPrivateProps>) {
  const { Routes, Route, navigate } = useContext<RouterContextType>(RouterContext)
  const { startPage } = useSelector(settingsSelectors.current)

  const variants: Variants = {
    initial: {
      opacity: 0,
      transform: 'scale(0.97)',
    },
    in: {
      opacity: 1,
      transform: 'scale(1)',
    },
    out: {
      opacity: 0,
      pointerEvents: 'none',
      transform: 'scale(0.95)',
    },
  }

  const spring = {
    type: 'spring',
    mass: 0.7,
    tension: 1000,
    stiffness: 200,
    damping: 12,
  }

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
      <Route path={routes.SETTINGS} element={
        <motion.div
          className="settings-panel-motion"
          initial="initial"
          animate="in"
          exit="out"
          variants={variants}
          transition={spring as Transition}
        >
          {settingsPanel}
        </motion.div>
      } />
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
