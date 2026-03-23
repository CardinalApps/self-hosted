import type { Meta } from '@storybook/react'
import { Route, Routes, Navigate, Router, MemoryRouter, useLocation, Link, useNavigate, useParams } from 'react-router-dom'

import AppBase from './AppBase'
import AppPage from './AppPage'
import SettingsPanel from '../SettingsPanel'
import CustomSettingsTab from './story-pages/settings/custom-tab'

// Layout pages
import StandardPage from './story-pages/layout/Standard'
import FixedPage from './story-pages/layout/Fixed'
import ThinPage from './story-pages/layout/Thin'
import FullPage from './story-pages/layout/Full'
import FileBrowserPage from './story-pages/layout/Files'
import ProceduralPage from './story-pages/layout/Procedural'

// Feature test pages
import ModalPage from './story-pages/feature/Modal'
import DrawerPage from './story-pages/feature/Drawer'
import PhotoViewerPage from './story-pages/feature/PhotoViewer'

import { PAGE_LAYOUT } from '../../../store/slices/layout/constants'
import { CardinalApp } from '../../../lib/env/cardinal'

import { routes } from './routes'

const meta = {
  title: 'Feature/AppBase',
  component: AppBase,
  argTypes: {},
} satisfies Meta<typeof AppBase>

const DemoApp = () => {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div
      style={{
        height: '100vh',
        marginLeft: -20,
        marginTop: -20,
        marginRight: -20,
        marginBottom: -20,
      }}
    >
      <AppBase
        app={CardinalApp.MUSIC}
        id="demo-home-server"
        name="Sandbox App"
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
        version="0.1.2"
        cardinalAppId="59068b7c-2c67-4d98-aef7-44d37914b86f"
        enableGlobalAudioPlayer={true}
        onLoginSuccess={() => console.log('Top level onLoginSuccess()')}
        onHomeServerRequiresFirstTimeSetup={() => console.log('Media Server requires first time setup; disregarding in sandbox mode.')}
        topLevelContextMenuItems={[
          {
            groupName: 'Demo App',
            items: [
              {
                render: () => <span>Example</span>,
                onClick: () => alert('Example clicked'),
              },
            ],
          },
        ]}
        sidebarOptions={{
          overflow: false,
          navigation: <>
            {/* Standard layout */}
            <li
              className={location.pathname === '/' ? 'active' : ''}
              key="standard-layout"
            >
              <Link to={'/'}>
                <i className="fas fa-border-all" />
                <span>Layout: standard</span>
              </Link>
            </li>

            {/* Thin layout */}
            <li
              className={location.pathname === `/${PAGE_LAYOUT["thin"]}` ? 'active' : ''}
              key="thin-layout"
            >
              <Link to={`/${PAGE_LAYOUT["thin"]}`}>
                <i className="fas fa-border-all" />
                <span>Layout: thin</span>
              </Link>
            </li>

            {/* Fixed height layout */}
            <li
              className={location.pathname === `/${PAGE_LAYOUT["fixed"]}` ? 'active' : ''}
              key="fixed-layout"
            >
              <Link to={`/${PAGE_LAYOUT["fixed"]}`}>
                <i className="fas fa-border-all" />
                <span>Layout: fixed</span>
              </Link>
            </li>

            {/* Full layout */}
            <li
              className={location.pathname === `/${PAGE_LAYOUT["full"]}` ? 'active' : ''}
              key="full-layout"
            >
              <Link to={`/${PAGE_LAYOUT["full"]}`}>
                <i className="fas fa-border-all" />
                <span>Layout: full</span>
              </Link>
            </li>

            {/* File Browser */}
            <li
              className={location.pathname === `/${PAGE_LAYOUT["files"]}` ? 'active' : ''}
              key="file-browser-layout"
            >
              <Link to={`/${PAGE_LAYOUT["files"]}`}>
                <i className="fas fa-border-all" />
                <span>Layout: files</span>
              </Link>
            </li>

            {/* Procedural */}
            <li
              className={location.pathname === `/${PAGE_LAYOUT["procedural"]}` ? 'active' : ''}
              key="procedural-layout"
            >
              <Link to={`/${PAGE_LAYOUT["procedural"]}`}>
                <i className="fas fa-border-all" />
                <span>Layout: procedural</span>
              </Link>
            </li>

            {/* Modal */}
            <li
              className={location.pathname === `/modal` ? 'active' : ''}
              key="modal-test-page"
            >
              <Link to={`/modal`}>
                <i className="fas fa-box" />
                <span>Feat: Modal</span>
              </Link>
            </li>

            {/* Drawer */}
            <li
              className={location.pathname === `/drawer` ? 'active' : ''}
              key="drawer-test-page"
            >
              <Link to={`/drawer`}>
                <i className="fas fa-box" />
                <span>Feat: Drawer</span>
              </Link>
            </li>

            {/* PhotoViewer */}
            <li
              className={location.pathname === `/photo-viewer` ? 'active' : ''}
              key="photo-viewer-test-page"
            >
              <Link to={`/photo-viewer`}>
                <i className="fas fa-box" />
                <span>Feat: PhotoViewer</span>
              </Link>
            </li>
          </>,
        }}
        settingsPanel={
          <SettingsPanel
            app={CardinalApp.MUSIC}
            onClose={() => navigate(routes.ROOT)}
            lang="en"
            customTabs={[
              {
                tabName: 'Custom Tab',
                tabIcon: 'fas fa-hotdog',
                tabContent: <CustomSettingsTab />,
              },
            ]}
          />
        }
        publicRoutes={
          <>
            <Route path="/custom-public" element={<AppPage>This is a custom public page. It uses a custom layout (no header, nav, etc), and it is accessible when logged in or out.</AppPage>} />
          </>
        }
        privateRoutes={
          <>
            <Route path="/custom-private" element={<AppPage>This is a custom private page. It uses a custom layout (no header, nav, etc), and it is only accessible to users who are logged into a Media Server account.</AppPage>} />
          </>
        }
        privateScaffoldRoutes={
          <>
            <Route
              path="/"
              element={<StandardPage />}
            />
            <Route
              path={`/${PAGE_LAYOUT["fixed"]}`}
              element={<FixedPage />}
            />
            <Route
              path={`/${PAGE_LAYOUT["thin"]}`}
              element={<ThinPage />}
            />
            <Route
              path={`/${PAGE_LAYOUT["full"]}`}
              element={<FullPage />}
            />
            <Route
              path={`/${PAGE_LAYOUT["files"]}`}
              element={<FileBrowserPage />}
            />
            <Route
              path={`/${PAGE_LAYOUT["procedural"]}`}
              element={<ProceduralPage />}
            />
            <Route
              path={`/modal`}
              element={<ModalPage />}
            />
            <Route
              path={`/drawer`}
              element={<DrawerPage />}
            />
            <Route
              path={`/photo-viewer`}
              element={<PhotoViewerPage />}
            />
          </>
        }
      />
    </div>
  )
}

export const SandboxApp = () => {
  return (
    <MemoryRouter>
      <DemoApp />
    </MemoryRouter>
  )
}

export default meta
