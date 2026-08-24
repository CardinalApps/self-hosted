import { useContext, useEffect, useState, type PropsWithChildren, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAppSelector } from '../../../hooks/useAppSelector'
import useWindowSize from '../../../hooks/useWindowSize'
import { appSelectors } from '../../../store/slices/app'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { RouterContext } from '../../../context/router'
import clsx from 'clsx'
import H1 from '../../typography/H1'
import BrandLogo from '../../layout/BrandLogo'
import WrittenText from '../../typography/WrittenText'
import Icon from '../../typography/Icon'

import Modal from '../../layout/Modal'
import AppMenu from '../../interaction/AppMenu'
import UserMenu from '../../interaction/UserMenu'

import homeServerUserLogout from '../../../store/slices/homeServerUser/thunks/logout'
import { settingsSelectors } from '../../../store/slices/settings'
import { CardinalApp } from '../../../lib/env/cardinal'

import LibrarySwitcher from './componenets/LibrarySwitcher'
import CloudStatusIcon from './componenets/CloudStatusIcon'
import ActivityIcon from './componenets/ActivityIcon'
import PlaybackSidebarIcon from './componenets/PlaybackSidebarIcon'
import { layoutSelectors, SIDEBAR_MODE } from '../../../store/slices/layout'

import i18n from './i18n'

import './AppHeader.css'

// Matches the width at which SidebarNav.css turns the nav into a bottom drawer
const MOBILE_MAX_WIDTH = 768

type AppHeaderProps = {
  onSwitchAccountClick?: () => void,
  loginButton?: ReactNode,
  showPlaybackSidebarToggle?: boolean,
}

/**
 * The main application header for the inside part of the web apps.
 */
const AppHeader = ({
  onSwitchAccountClick,
  loginButton,
  showPlaybackSidebarToggle = false,
}: PropsWithChildren<AppHeaderProps>) => {
  const dispatch = useAppDispatch()
  const kioskMode = useAppSelector(appSelectors.kioskMode)
  const { Link } = useContext(RouterContext)
  const { lang, open_apps_in_new_tab, enable_glass } = useAppSelector(settingsSelectors.current)
  const [showBadgeModal, setShowBadgeModal] = useState<'kiosk'>()
  const sidebarMode = useAppSelector(layoutSelectors.sidebarMode)
  const app = useAppSelector(appSelectors.app)
  const appName = useAppSelector(appSelectors.name)
  const windowSize = useWindowSize()
  const isMobile = !!windowSize.width && windowSize.width <= MOBILE_MAX_WIDTH

  /*
    The slot belongs to the sidebar nav, which commits after this header, so it can only be
    looked up once both are mounted.
  */
  const [mobileHeaderSlot, setMobileHeaderSlot] = useState<Element | null>(null)
  useEffect(() => {
    setMobileHeaderSlot(document.querySelector('#sidebar-nav-mobile-header'))
  }, [])

  // Without a slot to move them to, the controls stay in the header rather than vanishing
  const inMobileDrawer = isMobile && !!mobileHeaderSlot

  const majorBadges = () => {
    const badges = []

    if (kioskMode) {
      badges.push(<span key="kiosk" onClick={() => setShowBadgeModal('kiosk')} style={{ background: '#e1531c' }}><Icon fa="fas fa-store" style={{ color: '#fff' }} />{i18n['major-badge.kiosk'][lang]}</span>)
    }
    if (app === CardinalApp.CINEMA || app === CardinalApp.PHOTOS) {
      badges.push(<span key="coming-soon" className="static" style={{ background: 'var(--accent-color)' }}><Icon fa="fas fa-clock" style={{ color: '#fff' }} />{i18n['major-badge.coming-soon'][lang]}</span>)
    }

    return badges
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
    <header className="app-header">
      <div className={clsx('app-header-bar', enable_glass && 'glass')}>
        <section className="logo-col">
          <div className="logo-type">
            {Link
              ? <Link to={'/'} className="logo">
                  <BrandLogo icon="birb" size="s" />
                  {logoText()}
                </Link>
              : <div className="logo">
                  <BrandLogo icon="birb" size="s" />
                  {logoText()}
                </div>
            }
          </div>
        </section>
        <section className="middle-col">
          <div id="toolbar-portal" />
        </section>
        <section className="menu-col">
          <div className="major-badges">
            {majorBadges()}
          </div>
          {!inMobileDrawer && <LibrarySwitcher />}
          {/* Playback sidebar toggle */}
          {!!showPlaybackSidebarToggle &&
            <div className="icon">
              <PlaybackSidebarIcon />
            </div>
          }
          {/* Activity icon */}
          {!inMobileDrawer &&
            <div className="icon">
              <ActivityIcon />
            </div>
          }
          {/* App menu icon */}
          <div className="icon">
            <AppMenu align="center" target={open_apps_in_new_tab ? '_blank' : undefined} />
          </div>
          {/* Cloud status icon */}
          <div className="icon">
            <CloudStatusIcon />
          </div>
          {/* User menu */}
          <div className="icon">
            <UserMenu
              onSwitchAccountClick={onSwitchAccountClick}
              loginButton={loginButton}
              onLogoutClick={() => dispatch(homeServerUserLogout())}
            />
          </div>
        </section>
      </div>
      {!!inMobileDrawer && createPortal(
        <>
          <LibrarySwitcher />
          <div className="icon">
            <ActivityIcon />
          </div>
        </>,
        mobileHeaderSlot,
      )}
      {showBadgeModal === 'kiosk' && (
        <Modal onClose={() => setShowBadgeModal(null)}>
          <WrittenText>
            <div dangerouslySetInnerHTML={{ __html: i18n['major-badge.kiosk.desc'][lang] }} />
          </WrittenText>
        </Modal>
      )}
    </header>
  )
}

export default AppHeader
