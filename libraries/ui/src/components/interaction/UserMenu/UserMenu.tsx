import { useState, useEffect } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import clsx from 'clsx'
import { useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import H3 from '../../typography/H3'
import { getSetting } from '@cardinalapps/app-settings/src'
// import ms from 'ms'

import Button from '../Button'

import { settingsSelectors } from '../../../store/slices/settings'
import { SupportedLang } from '@cardinalapps/app-settings/src/types'
import { cloudUserSelectors } from '../../../store/slices/cloudUser'
import { appSelectors } from '../../../store/slices/app'
import { layoutActions } from '../../../store/slices/layout'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import set from '../../../store/slices/settings/thunks/set'
import UserTag from '../UserTag'
import { homeServerUserSelectors } from '../../../store/slices/homeServerUser'
import Select from '../../forms/Select'

import i18n from './i18n'

import './UserMenu.css'

type UserMenuProps = {
  onSwitchAccountClick?: () => void,
  loginButton?: ReactNode,
  onLogoutClick?: () => void,
  onSettingsClick?: () => void,
}

/**
 * UserMenu.
 */
const UserMenu = ({
  onSwitchAccountClick,
  onLogoutClick,
  loginButton,
}: PropsWithChildren<UserMenuProps>) => {
  const dispatch = useAppDispatch()
  const app = useSelector(appSelectors.app)
  const currentHomeServerUser = useSelector(homeServerUserSelectors.current)
  const currentCloudUser = useSelector(cloudUserSelectors.current)
  const { lang, theme } = useSelector(settingsSelectors.current)
  const [menuIsOpen, setMenuIsOpen] = useState(false)

  const handleSettingsClick = () => {
    setMenuIsOpen(false)
    dispatch(layoutActions.setSettingsPanelOpen(true))
  }

  const themeFieldFactory = getSetting('theme')
  const themeField = themeFieldFactory(app, lang as SupportedLang)

  const handleLogout = () => {
    setMenuIsOpen(false)
    if (typeof onLogoutClick === 'function') {
      onLogoutClick()
    }
  }

  const handleSwitchAccountClick = () => {
    if (onSwitchAccountClick && typeof onSwitchAccountClick === 'function') {
      onSwitchAccountClick()
    }
  }

  // const memberDays = () => {
  //   const createdDate = new Date(currentUser?.createdAt)
  //   const createdMsAgo = Date.now() - createdDate.getTime()

  //   if (createdMsAgo < ms('1d')) {
  //     return i18n['user-menu.member-days.today']['en']
  //   }
  //   else if (createdMsAgo < ms('30d')) {
  //     return i18n['user-menu.member-days.less-than-1-month']['en']
  //   }
  //   else if (createdMsAgo < ms('1y')) {
  //     return i18n['user-menu.member-days.less-than-1-year']['en']
  //   }
  //   else {
  //     return i18n['user-menu.member-days.default']['en']
  //       .replace('{month}', String((createdDate.getMonth() + 1)).padStart(2, '0'))
  //       .replace('{year}', createdDate.getFullYear().toString())
  //   }
  // }

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setMenuIsOpen(false)
      }
    }

    const onClickOutside = (e) => {
      if (!e.target.closest('.user-menu') && !e.target.matches('.option')) {
        setMenuIsOpen(false)
      }
    }

    document.addEventListener('keydown', onEsc)
    document.addEventListener('click', onClickOutside)

    return () => {
      document.removeEventListener('keydown', onEsc)
      document.removeEventListener('click', onClickOutside)
    }
  }, [])

  return (
    <div className={clsx(`user-menu`, menuIsOpen && 'open', currentHomeServerUser?.cardinalId && 'cloud-user-logged-in')}>
      <button className="avatar-btn" onClick={() => setMenuIsOpen(!menuIsOpen)}>
        <UserTag user={currentHomeServerUser} showName={false} size="s" />
      </button>
      <div className="user-dropdown-under">
        <div className="user-dropdown-inner">
          <AnimatePresence>
            {menuIsOpen
              ? <>
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0, transition: { type: "spring", delay: 0.15 } }}
                    className="user-dropdown-greeting"
                  >
                    <div className="user-meta">
                      <p className="public-name">
                        {currentHomeServerUser?.cardinalId
                          ? currentCloudUser?.publicName || i18n['user-menu.logged-in.public-name.fallback']['en']
                          : currentHomeServerUser?.username || i18n['user-menu.logged-in.public-name.fallback']['en']
                        }
                      </p>
                      <div>
                        {/* <span
                          className="member-days"
                          title={i18n['user-menu.member-days.tooltip']['en'].replace('{date}', new Date(currentUser?.createdAt).toDateString())}
                        >
                          {memberDays()}
                        </span> */}
                        <span
                          className="subscription"
                          // title={memberDays()}
                        >
                          <i className="fas fa-trophy" />
                          {i18n[`user-menu.subscription.${currentCloudUser.subscription}`]?.['en'] || i18n[`user-menu.subscription.free`]?.['en']}
                        </span>
                      </div>
                    </div>
                    {/* {
                      loggedIn
                        ? 
                        : <div className="user-meta">
                            <p className="public-name">{i18n['user-menu.logged-out.public-name']['en']}</p>
                            <p className="switch-away">
                              <button type="button" onClick={handleSwitchAccountClick}>{i18n['user-menu.switch-account']['en']}</button>
                              <span className="sep">/</span>
                              <button onClick={() => navigate(routes.SETTINGS)}>
                                {i18n['user-menu.app-settings']['en']}
                              </button>
                            </p>
                          </div>
                    } */}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0, transition: { type: "spring", delay: 0.30 } }}
                  >
                    <nav className={`user-dropdown-menu`}>
                      <div className="logged-in-items">
                        {
                          // Media server
                        }
                          <H3 className="user-dropdown-section-title">{i18n['user-menu.quick-settings']['en']}</H3>
                          <div className="user-menu-quick-settings">
                            <Select
                              size="s"
                              name={themeField.slug}
                              options={themeField.options as Record<string, string>}
                              value={theme as string}
                              multi={false}
                              min={1}
                              onChange={(val) => dispatch(set({
                                settings: {
                                  [themeField.slug]: val,
                                },
                                app: app,
                              }))}
                            />
                          </div>
                          <H3 className="user-dropdown-section-title">{i18n['user-menu.media-server']['en']}</H3>
                          <div className="user-dropdown-button-group">
                            <ul>
                              <li>
                                <Button onClick={handleSettingsClick} icon="fas fa-cog">
                                  {i18n['user-menu.app-settings']['en']}
                                </Button>
                              </li>
                              <li>
                                <Button href="https://help.cardinalapps.io" target="_blank" icon="fas fa-info-circle">
                                  {i18n['user-menu.help']['en']}
                                </Button>
                              </li>
                              <li>
                                <Button onClick={handleSwitchAccountClick} icon="fas fa-users">
                                  {i18n['user-menu.switch-account']['en']}
                                </Button>
                              </li>
                              <li>
                                <Button onClick={handleLogout} icon="fas fa-sign-out-alt">
                                  {i18n['user-menu.logout']['en']}
                                </Button>
                              </li>
                            </ul>
                          </div>
                          {
                            // Cloud
                          }
                          <H3 className="user-dropdown-section-title">{i18n['user-menu.cloud']['en']}</H3>
                          {currentHomeServerUser?.cardinalId
                            ? (
                              <div className="user-dropdown-button-group">
                                <ul >
                                  <li>
                                    <Button href="https://account.cardinalapps.io" target="_blank" icon="fas fa-user-circle">
                                      {i18n['user-menu.my-account']['en']}
                                    </Button>
                                  </li>
                                  <li>
                                    <Button href="https://status.cardinalapps.io" target="_blank" icon="fas fa-cloud">
                                      {i18n['user-menu.status']['en']}
                                    </Button>
                                  </li>
                                  <li>
                                    <Button href="https://cardinal.discourse.group" target="_blank" icon="fas fa-comments">
                                      {i18n['user-menu.forums']['en']}
                                    </Button>
                                  </li>
                                </ul>
                              </div>
                            )
                            : (
                              <div className="user-dropdown-button-group">
                                {!!loginButton && loginButton}
                              </div>
                            )
                          }
                          <div className="links">
                            {/* <span>
                              <i className="fas fa-comments" />
                              <a href="https://forums.cardinalapps.io" target="_blank">
                                {i18n['user-menu.forums']['en']}
                              </a>
                            </span> */}
                            <span>
                              <a href="https://cardinalapps.io" target="_blank">
                                {i18n['user-menu.website']['en']}
                              </a>
                            </span>
                          </div>
                        </div>
                      {/* {loggedIn
                        ? 
                        : <div className="logged-out-items">
                            <ul>
                              <li className="accent">
                                <a href="https://account.cardinalapps.io" className="accent-button" target="_blank">
                                  <span>{i18n['user-menu.create-account-c2a']['en']}</span>
                                </a>
                              </li>
                            </ul>
                            <div className="sep"><span>{i18n['user-menu.then']['en']}</span></div>
                            <ul>
                              <li>
                                {!!loginButton && loginButton}
                              </li>
                            </ul>
                          </div>
                      } */}
                    </nav>
                  </motion.div>
                </>
              : null
            }
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default UserMenu
