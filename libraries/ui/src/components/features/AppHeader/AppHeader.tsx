import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { useAppSelector } from '../../../hooks/useAppSelector'

import Modal from '../../layout/Modal'
import AppMenu from '../../interaction/AppMenu'
import UserMenu from '../../interaction/UserMenu'

import homeServerUserLogout from '../../../store/slices/homeServerUser/thunks/logout'
import { settingsSelectors } from '../../../store/slices/settings'
import { useAppDispatch } from '../../../hooks/useAppDispatch'

import LibrarySwitcher from './componenets/LibrarySwitcher'
import CloudStatusIcon from './componenets/CloudStatusIcon'
import ActivityIcon from './componenets/ActivityIcon'

import i18n from './i18n'

import './AppHeader.css'
import WrittenText from '../../typography/WrittenText'
import clsx from 'clsx'

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
  //const kioskMode = useAppSelector(appSelectors.kioskMode)
  const { lang, open_apps_in_new_tab, enable_glass } = useAppSelector(settingsSelectors.current)
  const [showBadgeModal, setShowBadgeModal] = useState<'kiosk' | 'planned' | 'wip'>()

  // const majorBadges = () => {
  //   const badges = []

  //   if (kioskMode) {
  //     badges.push(<span key="kiosk" onClick={() => setShowBadgeModal('kiosk')} style={{ background: '#e1531c' }}><i className="fas fa-store" />{i18n['major-badge.kiosk'][lang]}</span>)
  //   }
  //   if (app === CardinalApp.CINEMA) {
  //     badges.push(<span key="planned" onClick={() => setShowBadgeModal('planned')} style={{ background: '#007bd7' }}><i className="fas fa-clock" />{i18n['major-badge.planned'][lang]}</span>)
  //   }
  //   if (app === CardinalApp.PHOTOS) {
  //     badges.push(<span key="wip" onClick={() => setShowBadgeModal('wip')} style={{ background: '#700bd8' }}><i className="fas fa-terminal" />{i18n['major-badge.wip'][lang]}</span>)
  //   }

  //   return badges
  // }

  return (
    <>
      <header className={clsx('app-header', enable_glass && 'glass')}>
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
