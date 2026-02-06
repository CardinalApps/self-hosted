import { Router, Route, Routes, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom'

import AppBase from '@cardinalapps/ui/src/components/features/AppBase'
import { MusicRoutes } from '@cardinalapps/ui/src/lib/net/router'

import Nav from '../Nav'
import SettingsPanel from '../SettingsPanel'

import ListenNow from '../../pages/ListenNow'
import ReleasesPage from '../../pages/Releases'
import ReleasePage from '../../pages/Release'
import ArtistsPage from '../../pages/Artists'
import ArtistPage from '../../pages/Artist'
import TracksPage from '../../pages/Tracks'
import HistoryPage from '../../pages/History'
import PlaylistsPage from '../../pages/Playlists'
import CardinalMusicSSOButton from '../CardinalMusicSSOButton'

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
      app={CardinalApp.MUSIC}
      id="cardinal-music"
      basePath="/music"
      router={{
        Router,
        Routes,
        Navigate,
        Route,
        location,
        navigate,
        Link,
        useLocation,
        useParams,
      }}
      cardinalAppId={CARDINAL_PUBLIC_APP_ID}
      ssoButton={<CardinalMusicSSOButton />}
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
            path={MusicRoutes.root}
            element={<ListenNow />}
          />
          <Route
            path={MusicRoutes.releases}
            element={<ReleasesPage />}
          />
          <Route
            path={MusicRoutes.release}
            element={<ReleasePage />}
          />
          <Route
            path={MusicRoutes.artists}
            element={<ArtistsPage />}
          />
          <Route
            path={MusicRoutes.artist}
            element={<ArtistPage />}
          />
          <Route
            path={MusicRoutes.tracks}
            element={<TracksPage />}
          />
          <Route
            path={MusicRoutes.history}
            element={<HistoryPage />}
          />
          <Route
            path={MusicRoutes.playlists}
            element={<PlaylistsPage />}
          />
        </>
      }
    />
  )
}

export default AppRoot
