import { useEffect, useState } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'

//import { settingSlug } from '@cardinalapps/app-settings/src'

import H2 from '../../typography/H2'
import H5 from '../../typography/H5'
import Button from '../../interaction/Button'
import BrandLogo from '../../layout/BrandLogo'
import Card from '../../layout/Card'
import UserTag from '../../interaction/UserTag'
import { BrandLogoIcon } from '../../layout/BrandLogo/BrandLogo'
import Form from '../../forms/Form'
import TextInput from '../../forms/TextInput'
import FormField from '../../forms/FormField'

import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { appSelectors } from '../../../store/slices/app'
//import { cloudUserSelectors } from '../../../store/slices/cloudUser'
import { homeServerUserSelectors } from '../../../store/slices/homeServerUser'
import { settingsSelectors } from '../../../store/slices/settings'
//import set from '../../../store/slices/settings/thunks/set'
import logout from '../../../store/slices/homeServerUser/thunks/logout'

import { AppBasePaths, CardinalApp } from '../../../lib/env/cardinal'

import i18n from './i18n'

import './LoginScreen.css'

type LoginScreenProps = {
  overrideApp?: CardinalApp,
  allowGuestAccount?: boolean,
  allowLocalAccount?: boolean,
  onLoginWithAnonymousAccountClick: () => void,
  onLoginWithLocalAccountClick?: (username: string, password: string) => void,
  cardinalSSOLoginButton: ReactNode,
  ownerAccount: Record<string, unknown>,
  onContinueAsCurrentUserClick: () => void,
}

/**
 * Allows the user to choose an account to log into.
 */
const LoginScreen = ({
  //ownerAccount,
  overrideApp,
  cardinalSSOLoginButton,
  allowGuestAccount = true,
  allowLocalAccount = true,
  onLoginWithAnonymousAccountClick,
  onLoginWithLocalAccountClick,
  onContinueAsCurrentUserClick,
}: PropsWithChildren<LoginScreenProps>) => {
  const dispatch = useAppDispatch()
  let app = useSelector(appSelectors.app)
  if (overrideApp) app = overrideApp
  //const cloudUserLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const homeServerUserLoggedIn = useSelector(homeServerUserSelectors.loggedIn)
  //const currentCloudUser = useSelector(cloudUserSelectors.current)
  const currentUser = useSelector(homeServerUserSelectors.current)
  const { lang } = useSelector(settingsSelectors.current)
  const [showCurrentUser, setShowCurrentUser] = useState(false)
  const [showLocalAccountForm, setShowLocalAccountForm] = useState(false)

  const getBg = () => {
    const base = AppBasePaths[app]

    switch (app) {
      case 'music':
        return `${base}/images/turntable.jpg`
      case 'photos':
        return `${base}/images/lens.jpg`
      case 'cinema':
        return `${base}/images/popcorn.jpg`
      case 'admin':
        return `${base}/images/satellite-dish.jpg`
      default:
        return `${base}/images/2.jpg`
    }
  }

  /**
   * Change the theme.
   * 
   * FIXME: can't use this until this is done: https://cardinalapps.youtrack.cloud/issue/CHS-31
   * In the meantime, changing the theme on the the login screen will not be remembered.
   */
  // const setTheme = (theme) => {
  //   dispatch(set({
  //     settings: {
  //       [settingSlug('theme')]: theme,
  //     },
  //   }))
  // }

  const handleContinueAsCurrentUserClick = () => {
    onContinueAsCurrentUserClick?.()
  }

  const handleLocalAccountLogin = (e, values) => {
    const { username, password } = values
    if (username) {
      onLoginWithLocalAccountClick?.(username, password)
    }
  }

  const handleGuestAccountClick = () => {
    onLoginWithAnonymousAccountClick?.()
  }

  useEffect(() => {
    if (homeServerUserLoggedIn) {
      // Prevent a flash of the currently logged in user info
      setTimeout(() => {
        setShowCurrentUser(true)
      }, 0)
    }
  }, [homeServerUserLoggedIn])

  return (
    <div className="login-screen" style={getBg() ? { 'backgroundImage': `url('${getBg()}')` } : undefined}>
      {getBg() ? <div className="bg-cover"></div> : undefined}
      <motion.div
        className="login-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.4 } }}
      >
        <Card className="login-card" shadow={2} border={3} bg={1}>
          <header>
            <div className="logo">
              <BrandLogo
                icon={app as BrandLogoIcon || 'birb'}
                className={clsx(app && 'icon')}
                size="s"
                border={true}
              />
              {app && <H2 className="title">{i18n[`app.${app}`]?.['en']}</H2>}
            </div>
          </header>
          <div className="account-list">
            {/* Current user */}
            {!!showCurrentUser &&
            <div>
              <H5 className="type-title">{i18n['current-session.title'][lang]}</H5>
              <section>
                <Card className={`account current-account`} bg={1} border={3} padding="thin">
                  <UserTag user={currentUser} size="s" />
                  <div className="btn">
                    <Button onClick={handleContinueAsCurrentUserClick}>{i18n['current-session.continue'][lang]}</Button>
                  </div>
                </Card>
              </section>
            </div>
            }
            <div>
              {/* Log in with SSO */}
              {homeServerUserLoggedIn
                ? <H5 className="type-title">{i18n['login.title.new-session'][lang]}</H5>
                : <H5 className="type-title">{i18n['login.title.first-session'][lang]}</H5>
              }
              <section className="button-group">
                {cardinalSSOLoginButton}
                {!!allowLocalAccount &&
                  <>
                    <Button onClick={() => setShowLocalAccountForm(!showLocalAccountForm)}>
                      {i18n['login.local-user'][lang]}
                    </Button>
                    <AnimatePresence>
                      {!!showLocalAccountForm &&
                        <motion.div
                          className="local-account-login"
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                        >
                          <Form onSubmit={handleLocalAccountLogin}>
                            <FormField label={i18n['login.local-user.username'][lang]}>
                              <TextInput type="text" name="username" />
                            </FormField>
                            <FormField label={i18n['login.local-user.password'][lang]}>
                              <TextInput type="password" name="password" />
                            </FormField>
                            <footer>
                              <Button type="submit" textual>{i18n['login.local-user.login'][lang]}</Button>
                            </footer>
                          </Form>
                        </motion.div>
                      }
                    </AnimatePresence>
                  </>
                }
                {!!allowGuestAccount && currentUser?.designation !== 'guest_account' &&
                  <Button onClick={handleGuestAccountClick} disabled={!allowGuestAccount}>
                    {i18n['guest-account.use'][lang]}
                  </Button>
                }
              </section>
            </div>
          </div>
          <footer>
            {homeServerUserLoggedIn && (
              <div className="log-out">
                <Button plain onClick={() => dispatch(logout())}>{i18n['footer.log-out'][lang]}</Button>
              </div>
            )}
            <div className="help">
              <div className="login-screen-help-link">
                <a href="https://help.cardinalapps.io/guides/cardinal-media-server/accounts" target="_blank">{i18n['footer.help'][lang]}</a>
                <i className="fas fa-external-link-alt" />
              </div>
              {/* {!!theme &&
                <div className="login-screen-theme-switcher">
                  <ThemeSwitcher value={theme} onChange={(theme) => dispatch(settingsActions.set({ key: 'theme', value: theme }))} />
                </div>
              } */}
            </div>
            <div className="login-screen-help-link">
              <a href="https://cardinalapps.io/contact" target="_blank">{i18n['footer.report'][lang]}</a>
              <i className="fas fa-external-link-alt" />
            </div>
          </footer>
        </Card>
      </motion.div>
    </div>
  )
}

export default LoginScreen
