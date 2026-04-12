import { useEffect, useState } from 'react'
import type { Meta } from '@storybook/react'
import { useAppDispatch } from '../../../hooks/useAppDispatch'

import AppHeader from './AppHeader'
import SSOLogin from '../../interaction/SSOLogin'

import fetchCloudUser from '../../../store/slices/cloudUser/thunks/fetch'
import { setJwt } from '../../../lib/auth/jwt'

const meta = {
  title: 'Feature/AppHeader',
  component: AppHeader,
  argTypes: {},
} satisfies Meta<typeof AppHeader>

export const Admin = () => {
  const dispatch = useAppDispatch()
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <div
      style={{
        marginLeft: -20,
        marginTop: -20,
        marginRight: -20,
      }}
    >
      <AppHeader
        onSwitchAccountClick={() => alert('Switch accounts')}
        loginButton={
          <SSOLogin
            appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
            permissions="*"
            saveJWTInLocalStorage={false}
            onSSOSuccess={(JWT) => setJWT(JWT)}
          />
        }
      />
    </div>
  )
}

export const Music = () => {
  const dispatch = useAppDispatch()
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <div
      style={{
        marginLeft: -20,
        marginTop: -20,
        marginRight: -20,
      }}
    >
      <AppHeader
        onSwitchAccountClick={() => alert('Switch accounts')}
        loginButton={
          <SSOLogin
            appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
            permissions="*"
            saveJWTInLocalStorage={false}
            onSSOSuccess={(JWT) => setJWT(JWT)}
          />
        }
      />
    </div>
  )
}

export const Photos = () => {
  const dispatch = useAppDispatch()
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <div
      style={{
        marginLeft: -20,
        marginTop: -20,
        marginRight: -20,
      }}
    >
      <AppHeader
        onSwitchAccountClick={() => alert('Switch accounts')}
        loginButton={
          <SSOLogin
            appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
            permissions="*"
            saveJWTInLocalStorage={false}
            onSSOSuccess={(JWT) => setJWT(JWT)}
          />
        }
      />
    </div>
  )
}

export const Cinema = () => {
  const dispatch = useAppDispatch()
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <div
      style={{
        marginLeft: -20,
        marginTop: -20,
        marginRight: -20,
      }}
    >
      <AppHeader
        onSwitchAccountClick={() => alert('Switch accounts')}
        loginButton={
          <SSOLogin
            appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
            permissions="*"
            saveJWTInLocalStorage={false}
            onSSOSuccess={(JWT) => setJWT(JWT)}
          />
        }
      />
    </div>
  )
}

export default meta
