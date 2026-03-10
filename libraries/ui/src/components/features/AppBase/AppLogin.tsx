import { PropsWithChildren, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '../../../hooks/useAppDispatch'

import { toastActions } from '../../../store/slices/toast'
import { settingsSelectors } from '../../../store/slices/settings'
import cloudUserLogout from '../../../store/slices/cloudUser/thunks/logout'
import { cloudUserSelectors } from '../../../store/slices/cloudUser'
import homeServerAPI, { CARDINAL_APP_HEADER } from '../../../lib/homeserver/homeServerAPI'

import LoginScreen from '../LoginScreen'

import { homeServerUserSelectors, homeServerUserActions } from '../../../store/slices/homeServerUser'
import homeServerLogin from '../../../store/slices/homeServerUser/thunks/login'
import { RouterContext } from '../../../context/router'

import i18n from './i18n'

import { routes } from './routes'
import { appSelectors } from '../../../store/slices/app'

type User = {
  designation: string,
  role: string,
  userId: string,
  cachedCloudUser: Record<string, unknown>
}

type AppLoginProps = {
  loginWithCardinalButton: ReactNode,
}

function AppLogin({
  loginWithCardinalButton,
}: PropsWithChildren<AppLoginProps>) {
  const { navigate } = useContext(RouterContext)
  const dispatch = useAppDispatch()
  const cloudUserLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const app = useSelector(appSelectors.app)
  const { lang } = useSelector(settingsSelectors.current)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [enableGuestAccount, setEnableGuestAccount] = useState<boolean>()
  const homeServerUserLoggedInAt = useSelector(homeServerUserSelectors.loggedInAt)
  const loginRedirectCompletedFor = useSelector(homeServerUserSelectors.loginRedirectCompletedFor)

  const fetchPublicUsers = () => {
    return new Promise((resolve) => {
      // FIXME use RTK API
      homeServerAPI('/users/public', 'GET', { headers: { [CARDINAL_APP_HEADER]: app } })
        .then((users) => {
          if (Array.isArray(users)) {
            setEnableGuestAccount(!!users.find((user) => user.designation === 'guest_account'))
            resolve(users)
          } else {
            resolve([])
          }
        })
        .catch((error) => {
          console.error(error)
          dispatch(toastActions.addToQueue({
            type: 'danger',
            title: i18n['login.error.cannot-load-users.title'][lang],
            body: i18n['login.error.cannot-load-users.body'][lang],
            ttl: 8000,
          }))
          resolve([])
        })
    })
  }

  /**
   * Returns the owner account from the fetched accounts.
   */
  const getOwnerAccount = () => {
    return allUsers.find((user) => user.role === 'owner')
  }

  /**
   * Returns the guest account from the fetched accounts.
   */
  const getGuestAccount = () => {
    return allUsers.find((user) => user.designation === 'guest_account')
  }

  /**
   * Log in with the guest account.
   */
  const loginAsGuest = () => {
    const guestAccount = getGuestAccount()

    if (!guestAccount) {
      return dispatch(toastActions.addToQueue({
        type: 'danger',
        title: i18n['login.error.guest-user-not-found.title'][lang],
        body: i18n['login.error.guest-user-not-found.body'][lang],
      }))
    }

    // Log the user out of their cloud account when logging into the guest account
    if (cloudUserLoggedIn) {
      dispatch(cloudUserLogout())
    }

    dispatch(homeServerLogin({
      userId: guestAccount.userId,
    }))
  }

  /**
   * Attempt to log in with a local account.
   */
  const loginWithLocalAccount = (username: string, password: string) => {
    // Log the user out of their cloud account when logging into a local account
    // FIXME only do this after a successful login
    if (cloudUserLoggedIn) {
      dispatch(cloudUserLogout())
    }

    dispatch(homeServerLogin({
      username,
      password,
    }))
  }

  /**
   * Continue with the currently logged in cloud account.
   */
  const continueAsCurrentUser = () => {
    navigate(routes.ROOT)
  }

  /**
   * Load all users.
   */
  useEffect(() => {
    fetchPublicUsers()
      .then((users) => {
        setAllUsers(users as User[])
      })
  }, [])

  /**
   * Use user login timestamp as a signal for when we need to redirect out of
   * here.
   */
  useEffect(() => {
    if (loginRedirectCompletedFor !== homeServerUserLoggedInAt) {
      dispatch(homeServerUserActions.setLoginRedirectCompletedFor(homeServerUserLoggedInAt))
      navigate(routes.ROOT)
    }
  }, [homeServerUserLoggedInAt])

  return (
    <LoginScreen
      cardinalSSOLoginButton={loginWithCardinalButton}
      allowGuestAccount={enableGuestAccount}
      allowLocalAccount={true} // TODO make this a user preference
      onLoginWithAnonymousAccountClick={loginAsGuest}
      onLoginWithLocalAccountClick={loginWithLocalAccount}
      onContinueAsCurrentUserClick={continueAsCurrentUser}
      ownerAccount={getOwnerAccount()?.cachedCloudUser}
    />
  )
}

export default AppLogin
