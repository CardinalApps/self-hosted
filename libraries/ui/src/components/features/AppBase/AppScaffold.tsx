import { useContext, useRef } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import clsx from 'clsx'

import Columns, { Column } from '../../layout/Columns'
import DocLink from '../../interaction/DocLink'
import SidebarNav from '../../interaction/SidebarNav'
import { MiniAudioPlayer } from '../AudioPlayer'
import { DirectoryTreeSidebarPortal, DirectoryTreeMobileButton } from '../../interaction/DirectoryTree'
import H1 from '../../typography/H1'
import H2 from '../../typography/H2'
import { settingsSelectors } from '../../../store/slices/settings'
import BrandLogo from '../../layout/BrandLogo'

import { layoutSelectors, SIDEBAR_MODE } from '../../../store/slices/layout'
import { PAGE_LAYOUT } from '../../../store/slices/layout'
import { RouterContext } from '../../../context/router'
import AccessError from '../../layout/AccessError'
import { appSelectors } from '../../../store/slices/app'
import { useAppSelector } from '../../../hooks/useAppSelector'

import i18n from './i18n'

export type SidebarOptions = {
  overflow: boolean,
  navigation: ReactNode,
}

type AppScaffoldProps = {
  header: ReactNode,
  sidebarOptions: SidebarOptions,
  privateScaffoldRoutes: ReactNode,
  enableGlobalAudioPlayer?: boolean,
}

function AppScaffold({
  header,
  sidebarOptions,
  privateScaffoldRoutes,
  enableGlobalAudioPlayer = false,
}: PropsWithChildren<AppScaffoldProps>) {
  const { Routes, Route } = useContext(RouterContext)
  const pageScrollRef = useRef(null)
  const { Link } = useContext(RouterContext)
  const mobileNavIsOpen = useAppSelector(layoutSelectors.mobileNavIsOpen)
  const sidebarMode = useAppSelector(layoutSelectors.sidebarMode)
  const layout = useAppSelector(layoutSelectors.current)
  const pageTitle = useAppSelector(layoutSelectors.pageTitle)
  const pageDocLink = useAppSelector(layoutSelectors.pageDocLink)
  const mobileFileBrowserIsOpen = useAppSelector(layoutSelectors.mobileFileBrowserIsOpen)
  const app = useAppSelector(appSelectors.app)
  const appName = useAppSelector(appSelectors.name)
  const { lang } = useAppSelector(settingsSelectors.current)

  const hasPageTitleBar = () => {
    const supportedLayouts = [
      PAGE_LAYOUT.standard,
      PAGE_LAYOUT.thin,
      PAGE_LAYOUT.fixed,
      PAGE_LAYOUT.files,
      PAGE_LAYOUT.procedural,
    ]
    if (supportedLayouts.includes(layout)) {
      if (pageTitle || pageDocLink) {
        return true
      }
    }
    return false
  }

  const logoText = () => {
    if (sidebarMode === SIDEBAR_MODE.collapsed) {
      return null
    }

    if (appName) {
      return <H1 className="title">{appName}</H1>
    }

    switch (app) {
      case 'admin':
        return <H1 className="title">{i18n['admin-title'][lang]}</H1>

      case 'music':
        return <H1 className="title">{i18n['music-title'][lang]}</H1>

      case 'photos':
        return <H1 className="title">{i18n['photos-title'][lang]}</H1>

      case 'cinema':
        return <H1 className="title">{i18n['cinema-title'][lang]}</H1>
    }
  }

  return (
    <div className={clsx('scaffold')} data-layout={layout}>
      {header}
      <div className={clsx('sidebar-nav-col')}>
        <div className="logo-type">
          {Link
            ? <Link to={'/'} className="logo">
                <BrandLogo icon="birb" size="s" />
              </Link>
            : <div className="logo">
                <BrandLogo icon="birb" size="s" />
              </div>
          }
          {logoText()}
        </div>
        <SidebarNav overflow={sidebarOptions?.overflow}>
          {sidebarOptions?.navigation}
        </SidebarNav>
      </div>
      <div className={clsx('sidebar-bottom')}>
        {!!enableGlobalAudioPlayer && <MiniAudioPlayer />}
      </div>
      <DirectoryTreeSidebarPortal />
      <section
        ref={pageScrollRef}
        className={clsx('main-col', !!mobileNavIsOpen && 'mobile-menu-open')}
      >
        <main className={clsx('page-content', !!mobileFileBrowserIsOpen && 'no-scroll')}>
          {layout === PAGE_LAYOUT.files && <DirectoryTreeMobileButton />}
          {hasPageTitleBar() && (
            <section className={clsx('page-title-bar')}>
              <Columns>
                <Column>
                  {!!pageTitle && <H2 className="page-title">{pageTitle}</H2>}
                </Column>
                <Column>
                  {!!pageDocLink && <DocLink href={pageDocLink} />}
                </Column>
              </Columns>
            </section>
          )}
          <Routes>
            {privateScaffoldRoutes ? privateScaffoldRoutes : null}
            {/* Top-level page error handling */}
            <Route path="*" element={<AccessError code={404} />} />
          </Routes>
        </main>
      </section>
    </div>
  )
}

export default AppScaffold
