import { useSelector } from 'react-redux'
import { useContext, type PropsWithChildren, type ReactNode } from 'react'

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
  const { lang, open_apps_in_new_tab } = useSelector(settingsSelectors.current)

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

  return (
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
        <div className="search">
          <SearchBar />
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
  )
}

export default AppHeader
