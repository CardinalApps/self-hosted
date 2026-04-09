import { useContext, useState, type PropsWithChildren, type ReactNode } from 'react'
import { useAppSelector } from '../../../hooks/useAppSelector'
import { appSelectors } from '../../../store/slices/app'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { RouterContext } from '../../../context/router'
import clsx from 'clsx'
import H1 from '../../typography/H1'
import BrandLogo from '../../layout/BrandLogo'
import WrittenText from '../../typography/WrittenText'

import Modal from '../../layout/Modal'
import AppMenu from '../../interaction/AppMenu'
import UserMenu from '../../interaction/UserMenu'

import homeServerUserLogout from '../../../store/slices/homeServerUser/thunks/logout'
import { settingsSelectors } from '../../../store/slices/settings'
import { CardinalApp } from '../../../lib/env/cardinal'

import LibrarySwitcher from './componenets/LibrarySwitcher'
import CloudStatusIcon from './componenets/CloudStatusIcon'
import ActivityIcon from './componenets/ActivityIcon'
import { layoutSelectors, SIDEBAR_MODE } from '../../../store/slices/layout'

import i18n from './i18n'

import './AppHeader.css'

type AppHeaderProps = {
  onSwitchAccountClick?: () => void,
  loginButton?: ReactNode,
}

/**
 * The main application header for the inside part of the web apps.
 */
const AppHeader = ({
  onSwitchAccountClick,
  loginButton,
}: PropsWithChildren<AppHeaderProps>) => {
  const dispatch = useAppDispatch()
  const kioskMode = useAppSelector(appSelectors.kioskMode)
  const { Link } = useContext(RouterContext)
  const { lang, open_apps_in_new_tab, enable_glass } = useAppSelector(settingsSelectors.current)
  const [showBadgeModal, setShowBadgeModal] = useState<'kiosk' | 'planned' | 'wip'>()
  const sidebarMode = useAppSelector(layoutSelectors.sidebarMode)
  const app = useAppSelector(appSelectors.app)
  const appName = useAppSelector(appSelectors.name)

  const majorBadges = () => {
    const badges = []

    if (kioskMode) {
      badges.push(<span key="kiosk" onClick={() => setShowBadgeModal('kiosk')} style={{ background: '#e1531c' }}><i className="fas fa-store" />{i18n['major-badge.kiosk'][lang]}</span>)
    }
    if (app === CardinalApp.CINEMA) {
      badges.push(<span key="planned" onClick={() => setShowBadgeModal('planned')} style={{ background: '#007bd7' }}><i className="fas fa-clock" />{i18n['major-badge.planned'][lang]}</span>)
    }
    if (app === CardinalApp.PHOTOS) {
      badges.push(<span key="wip" onClick={() => setShowBadgeModal('wip')} style={{ background: '#700bd8' }}><i className="fas fa-terminal" />{i18n['major-badge.wip'][lang]}</span>)
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
                </Link>
              : <div className="logo">
                  <BrandLogo icon="birb" size="s" />
                </div>
            }
            {logoText()}
          </div>
        </section>
        <section className="middle-col">
          <div id="toolbar-portal" />
        </section>
        <section className="menu-col">
          <div className="major-badges">
            {majorBadges()}
          </div>
          <LibrarySwitcher />
          {/* Activity icon */}
          <div className="icon">
            <ActivityIcon />
          </div>
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
      {showBadgeModal === 'kiosk' && (
        <Modal onClose={() => setShowBadgeModal(null)}>
          <WrittenText>
            <div dangerouslySetInnerHTML={{ __html: i18n['major-badge.kiosk.desc'][lang] }} />
          </WrittenText>
        </Modal>
      )}
      {showBadgeModal === 'wip' && (
        <Modal onClose={() => setShowBadgeModal(null)}>
          <WrittenText>
            <div dangerouslySetInnerHTML={{ __html: i18n['major-badge.wip.desc'][lang] }} />
          </WrittenText>
        </Modal>
      )}
      {showBadgeModal === 'planned' && (
        <Modal onClose={() => setShowBadgeModal(null)}>
          <WrittenText>
            <div dangerouslySetInnerHTML={{ __html: i18n['major-badge.planned.desc'][lang] }} />
          </WrittenText>
        </Modal>
      )}
    </header>
  )
}

export default AppHeader
