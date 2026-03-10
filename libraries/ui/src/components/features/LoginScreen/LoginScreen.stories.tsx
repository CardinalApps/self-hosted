import { useState, useEffect } from 'react'
import type { Meta } from '@storybook/react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '../../../hooks/useAppDispatch'

import LoginScreen from './LoginScreen'

import { cloudUserSelectors } from '../../../store/slices/cloudUser'
import fetchCloudUser from '../../../store/slices/cloudUser/thunks/fetch'

import { setJwt } from '../../../lib/auth/jwt'

import SSOLogin from '../../interaction/SSOLogin'
import { CardinalApp } from '../../../lib/env/cardinal'

const meta = {
  title: 'Feature/LoginScreen',
  component: LoginScreen,
  argTypes: {},
} satisfies Meta<typeof LoginScreen>

export const Admin = () => {
  const dispatch = useAppDispatch()
  const isLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const currentUser = useSelector(cloudUserSelectors.current)
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <LoginScreen
      overrideApp={CardinalApp.ADMIN}
      allowGuestAccount={true}
      ownerAccount={isLoggedIn ? currentUser : undefined}
      onContinueAsCurrentUserClick={() => alert('Continuing as current user')}
      onLoginWithAnonymousAccountClick={() => alert('Continuing with anonymous account')}
      cardinalSSOLoginButton={
        <SSOLogin
          appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
          permissions="*"
          saveJWTInLocalStorage={false}
          onSSOSuccess={(JWT) => setJWT(JWT)}
        />
      }
    />
  )
}

export const Music = () => {
  const dispatch = useAppDispatch()
  const isLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const currentUser = useSelector(cloudUserSelectors.current)
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <LoginScreen
      overrideApp={CardinalApp.MUSIC}
      allowGuestAccount={true}
      ownerAccount={isLoggedIn ? currentUser : undefined}
      onContinueAsCurrentUserClick={() => alert('Continuing as current user')}
      onLoginWithAnonymousAccountClick={() => alert('Continuing with anonymous account')}
      cardinalSSOLoginButton={
        <SSOLogin
          appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
          permissions="*"
          saveJWTInLocalStorage={false}
          onSSOSuccess={(JWT) => setJWT(JWT)}
        />
      }
    />
  )
}

export const Photos = () => {
  const dispatch = useAppDispatch()
  const isLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const currentUser = useSelector(cloudUserSelectors.current)
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <LoginScreen
      overrideApp={CardinalApp.PHOTOS}
      allowGuestAccount={true}
      ownerAccount={isLoggedIn ? currentUser : undefined}
      onContinueAsCurrentUserClick={() => alert('Continuing as current user')}
      onLoginWithAnonymousAccountClick={() => alert('Continuing with anonymous account')}
      cardinalSSOLoginButton={
        <SSOLogin
          appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
          permissions="*"
          saveJWTInLocalStorage={false}
          onSSOSuccess={(JWT) => setJWT(JWT)}
        />
      }
    />
  )
}

export const Cinema = () => {
  const dispatch = useAppDispatch()
  const isLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const currentUser = useSelector(cloudUserSelectors.current)
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <LoginScreen
      overrideApp={CardinalApp.CINEMA}
      allowGuestAccount={true}
      ownerAccount={isLoggedIn ? currentUser : undefined}
      onContinueAsCurrentUserClick={() => alert('Continuing as current user')}
      onLoginWithAnonymousAccountClick={() => alert('Continuing with anonymous account')}
      cardinalSSOLoginButton={
        <SSOLogin
          appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
          permissions="*"
          saveJWTInLocalStorage={false}
          onSSOSuccess={(JWT) => setJWT(JWT)}
        />
      }
    />
  )
}

export const GuestAccountDisabled = () => {
  const dispatch = useAppDispatch()
  const isLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const currentUser = useSelector(cloudUserSelectors.current)
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <LoginScreen
      overrideApp={CardinalApp.ADMIN}
      allowGuestAccount={false}
      ownerAccount={isLoggedIn ? currentUser : undefined}
      onContinueAsCurrentUserClick={() => alert('Continuing as current user')}
      onLoginWithAnonymousAccountClick={() => alert('Continuing with anonymous account')}
      cardinalSSOLoginButton={
        <SSOLogin
          appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
          permissions="*"
          saveJWTInLocalStorage={false}
          onSSOSuccess={(JWT) => setJWT(JWT)}
        />
      }
    />
  )
}

export const OnlyCloudAccount = () => {
  const dispatch = useAppDispatch()
  const isLoggedIn = useSelector(cloudUserSelectors.loggedIn)
  const currentUser = useSelector(cloudUserSelectors.current)
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <LoginScreen
      overrideApp={CardinalApp.ADMIN}
      allowGuestAccount={false}
      allowLocalAccount={false}
      ownerAccount={isLoggedIn ? currentUser : undefined}
      onContinueAsCurrentUserClick={() => alert('Continuing as current user')}
      onLoginWithAnonymousAccountClick={() => alert('Continuing with anonymous account')}
      cardinalSSOLoginButton={
        <SSOLogin
          appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
          permissions="*"
          saveJWTInLocalStorage={false}
          onSSOSuccess={(JWT) => setJWT(JWT)}
        />
      }
    />
  )
}

export default meta
