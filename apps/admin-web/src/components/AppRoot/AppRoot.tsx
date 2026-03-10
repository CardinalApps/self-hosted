import { Router, Route, Routes, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom'

import AppBase from '@cardinalapps/ui/src/components/features/AppBase'
import { AdminRoutes } from '@cardinalapps/ui/src/lib/net/router'

import Nav from '../Nav'
import SettingsPanel from '../SettingsPanel'

import Overview from '../../pages/Overview'
import Indexing from '../../pages/Indexing'
import Users from '../../pages/Users'
import Jobs from '../../pages/Jobs'
import Libraries from '../../pages/Libraries'
import FirstTimeSetup from '../../pages/FirstTimeSetup'
import Roles from '../../pages/Roles'
import CardinalAdminSSOButton from '../CardinalAdminSSOButton'

import { CardinalApp } from '@cardinalapps/ui/src/lib/env/cardinal'
import { CARDINAL_PUBLIC_APP_ID } from '../../env'

import i18n from './i18n.json'

import '@cardinalapps/ui/public/styles/global.css'
import '../../styles/app.css'

/**
 * The app root component is the very top of this Cardinal app. It handles setting
 * up the AppBase.
 */
function AppRoot() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <AppBase
      app={CardinalApp.ADMIN}
      id="cardinal-admin"
      basePath="/admin"
      router={{
        Router,
        Routes,
        Navigate,
        Route,
        location,
        navigate,
        Link,
        useParams,
        useLocation,
      }}
      cardinalAppId={CARDINAL_PUBLIC_APP_ID}
      ssoButton={<CardinalAdminSSOButton />}
      onHomeServerRequiresFirstTimeSetup={() => {
        navigate(AdminRoutes.first_time_setup)
      }}
      topLevelContextMenuItems={[
        {
          groupName: i18n['app.context-menu-group-name']['en'],
          items: [
            {
              render: () => <span>{i18n['app.context-menu.settings']['en']}</span>,
              onClick: () => console.log('Settings clicked'),
            },
          ],
        },
      ]}
      sidebarOptions={{
        overflow: false,
        navigation: <Nav />,
      }}
      enableGlobalAudioPlayer={true}
      settingsPanel={<SettingsPanel />}
        publicRoutes={
          <>
            <Route
              path={AdminRoutes.first_time_setup}
              element={<FirstTimeSetup />}
            />
          </>
        }
        privateRoutes={
          <>
            <Route
              path={AdminRoutes.first_time_setup}
              element={<FirstTimeSetup />}
            />
          </>
        }
        privateScaffoldRoutes={
          <>
            <Route
              path={AdminRoutes.root}
              element={<Overview />}
            />
            <Route
              path={AdminRoutes.users}
              element={<Users />}
            />
            <Route
              path={AdminRoutes.roles}
              element={<Roles />}
            />
            <Route
              path={AdminRoutes.indexing}
              element={<Indexing />}
            />
            <Route
              path={AdminRoutes.jobs}
              element={<Jobs />}
            />
            <Route
              path={AdminRoutes.libraries}
              element={<Libraries />}
            />
          </>
        }
      />
  )
}

export default AppRoot
