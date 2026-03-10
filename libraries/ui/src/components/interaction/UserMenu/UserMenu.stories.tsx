import { useState, useEffect } from 'react'
import type { Meta } from '@storybook/react'
import { useAppDispatch } from '../../../hooks/useAppDispatch'

import fetchCloudUser from '../../../store/slices/cloudUser/thunks/fetch'

import { setJwt } from '../../../lib/auth/jwt'

import SSOLogin from '../SSOLogin'

import UserMenu from './UserMenu'

const meta = {
  title: 'Interaction/UserMenu',
  component: UserMenu,
  argTypes: {},
} satisfies Meta<typeof UserMenu>

export const Default = () => {
  const dispatch = useAppDispatch()
  const [JWT, setJWT] = useState<string>()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchCloudUser())
  }, [JWT])

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <UserMenu
        loginButton={
          <SSOLogin
            appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
            permissions="*"
            saveJWTInLocalStorage={false}
            onSSOSuccess={(JWT) => setJWT(JWT)}
          />
        }
        onSettingsClick={() => console.log('Settings clicked')}
      />
    </div>
  )
}

export default meta
