import { useContext, useState, type PropsWithChildren, type ReactNode } from 'react'
import { useAppSelector } from '../../../hooks/useAppSelector'
import { appSelectors } from '../../../store/slices/app'

import Modal from '../../layout/Modal'
import H2 from '../../typography/H2'
import BrandLogo from '../../layout/BrandLogo'
import SearchBar from '../../interaction/SearchBar'
import AppMenu from '../../interaction/AppMenu'
import UserMenu from '../../interaction/UserMenu'

import homeServerUserLogout from '../../../store/slices/homeServerUser/thunks/logout'
import { settingsSelectors } from '../../../store/slices/settings'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { RouterContext } from '../../../context/router'
import { CardinalApp } from '../../../lib/env/cardinal'

import LibrarySwitcher from './componenets/LibrarySwitcher'
import CloudStatusIcon from './componenets/CloudStatusIcon'
import ActivityIcon from './componenets/ActivityIcon'

import i18n from './i18n'

import './AppHeader.css'
import WrittenText from '../../typography/WrittenText'

type AppHeaderProps = {
  app?: CardinalApp,
  logoClickTo?: string,
  onSwitchAccountClick?: () => void,
  loginButton?: ReactNode,
  appName?: string,
}

/**
 * The main application header for the inside part of the web apps.
 */
const AppHeader = ({
  app,
  logoClickTo,
  onSwitchAccountClick,
  loginButton,
  appName,
}: PropsWithChildren<AppHeaderProps>) => {
  const dispatch = useAppDispatch()
  const { Link } = useContext(RouterContext)
  const kioskMode = useAppSelector(appSelectors.kioskMode)
  const { lang, open_apps_in_new_tab } = useAppSelector(settingsSelectors.current)
  const [showBadgeModal, setShowBadgeModal] = useState<'kiosk' | 'planned' | 'wip'>()

  const logoText = () => {
    if (appName) {
      return <H2 className="title">{appName}</H2>
    }

    switch (app) {
      case 'admin':
        return <H2 className="title">{i18n['admin-title'][lang]}</H2>

      case 'music':
        return <H2 className="title">{i18n['music-title'][lang]}</H2>

      case 'photos':
        return <H2 className="title">{i18n['photos-title'][lang]}</H2>

      case 'cinema':
        return <H2 className="title">{i18n['cinema-title'][lang]}</H2>
    }
  }

  const majorBadges = () => {
    const badges = []

    if (kioskMode) {
      badges.push(<span key="kiosk" onClick={() => setShowBadgeModal('kiosk')} style={{ background: '#578cdd' }}>{i18n['major-badge.kiosk'][lang]}</span>)
    }
    if (app === CardinalApp.CINEMA) {
      badges.push(<span key="planned" onClick={() => setShowBadgeModal('planned')} style={{ background: '#d05858' }}>{i18n['major-badge.planned'][lang]}</span>)
    }
    if (app === CardinalApp.PHOTOS) {
      badges.push(<span key="wip" onClick={() => setShowBadgeModal('wip')} style={{ background: '#6aad68' }}>{i18n['major-badge.wip'][lang]}</span>)
    }

    return badges
  }

  return (
    <>
      <header className="app-header">
        <div className="left">
          <div className="logo-type">
            {Link && logoClickTo
              ? <Link to={logoClickTo} className="logo">
                  <BrandLogo icon="birb" size="s" />
                </Link>
              : <div className="logo">
                  <BrandLogo icon="birb" size="s" />
                </div>
            }
            {logoText()}
          </div>
          <div className="mid">
            <SearchBar />
            <div className="major-badges">
              {majorBadges()}
            </div>
          </div>
        </div>
        <div className="right">
          <section>
            <LibrarySwitcher />
          </section>
          <section>
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
          </section>
          {/* User menu */}
          <div className="icon">
            <UserMenu
              onSwitchAccountClick={onSwitchAccountClick}
              loginButton={loginButton}
              onLogoutClick={() => dispatch(homeServerUserLogout())}
            />
          </div>
        </div>
      </header>
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
    </>
  )
}

export default AppHeader
