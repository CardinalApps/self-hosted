import { Router, Route, Routes, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom'

import AppBase from '@cardinalapps/ui/src/components/features/AppBase'
import { CinemaRoutes } from '@cardinalapps/ui/src/lib/net/router'

import Nav from '../Nav'
import SettingsPanel from '../SettingsPanel'

import ChannelsPage from '../../pages/Channels'
import HistoryPage from '../../pages/History'
import LibrariesPage from '../../pages/Libraries'
import MoviesPage from '../../pages/Movies'
import PlaylistsPage from '../../pages/Playlists'
import TVPage from '../../pages/TV'
import WatchNowPage from '../../pages/WatchNow'
import CardinalCinemaSSOButton from '../CardinalCinemaSSOButton'

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
      app={CardinalApp.CINEMA}
      id="cardinal-cinema"
      basePath="/cinema"
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
      ssoButton={<CardinalCinemaSSOButton />}
      onHomeServerRequiresFirstTimeSetup={() => window.location.href = window.location.origin + '/admin'}
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
      publicRoutes={<></>}
      privateRoutes={<></>}
      privateScaffoldRoutes={
        <>
          <Route
            path={CinemaRoutes.root}
            element={<WatchNowPage />}
          />
          <Route
            path={CinemaRoutes.movies}
            element={<MoviesPage />}
          />
          <Route
            path={CinemaRoutes.tv}
            element={<TVPage />}
          />
          <Route
            path={CinemaRoutes.channels}
            element={<ChannelsPage />}
          />
          <Route
            path={CinemaRoutes.history}
            element={<HistoryPage />}
          />
          <Route
            path={CinemaRoutes.playlists}
            element={<PlaylistsPage />}
          />
          <Route
            path={CinemaRoutes.libraries}
            element={<LibrariesPage />}
          />
        </>
      }
    />
  )
}

export default AppRoot
