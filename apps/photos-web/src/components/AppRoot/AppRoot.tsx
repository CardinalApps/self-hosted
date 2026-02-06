import { Router, Route, Routes, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom'

import AppBase from '@cardinalapps/ui/src/components/features/AppBase'
import { PhotoRoutes } from '@cardinalapps/ui/src/lib/net/router'

import Nav from '../Nav'
import SettingsPanel from '../SettingsPanel'

import ArchivePage from '../../pages/Archive'
import PhotoAlbumsPage from '../../pages/PhotoAlbums'
import PhotoAlbumPage from '../../pages/PhotoAlbum'
import PeoplePage from '../../pages/People'
import PhotoPage from '../../pages/Photo'
import LocationsPage from '../../pages/Locations'
import CardinalPhotosSSOButton from '../CardinalPhotosSSOButton'

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
      app={CardinalApp.PHOTOS}
      id="cardinal-photos"
      basePath="/photos"
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
      ssoButton={<CardinalPhotosSSOButton />}
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
            path={PhotoRoutes.root}
            element={<ArchivePage />}
          />
          <Route
            path={PhotoRoutes.photo_albums}
            element={<PhotoAlbumsPage />}
          />
          <Route
            path={PhotoRoutes.photo_album}
            element={<PhotoAlbumPage />}
          />
          <Route
            path={PhotoRoutes.people}
            element={<PeoplePage />}
          />
          <Route
            path={PhotoRoutes.locations}
            element={<LocationsPage />}
          />
          <Route
            path={PhotoRoutes.photo}
            element={<PhotoPage />}
          />
        </>
      }
    />
  )
}

export default AppRoot
