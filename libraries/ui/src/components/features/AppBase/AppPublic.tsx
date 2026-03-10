import { useContext, type PropsWithChildren, type ReactNode } from 'react'

import AppLogin from './AppLogin'

import { routes } from './routes'
import { RouterContext } from '../../../context/router'

type AppPublicProps = {
  publicRoutes: ReactNode,
  loginWithCardinalButton: ReactNode,
}

/**
 * This part of the component tree is accessible publicly.
 */
function AppPublic({
  publicRoutes,
  loginWithCardinalButton,
}: PropsWithChildren<AppPublicProps>) {
  const { Routes, Route, Navigate } = useContext(RouterContext)
  return (
    <Routes>
      {publicRoutes ? publicRoutes : null}
      <Route path={routes.LOGIN} element={<AppLogin loginWithCardinalButton={loginWithCardinalButton} />} />
      <Route path="*" element={<Navigate to={routes.LOGIN} />} />
    </Routes>
  )
}

export default AppPublic
