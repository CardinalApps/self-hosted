import { useState, useEffect } from 'react'
import type { Meta } from '@storybook/react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '../../../hooks/useAppDispatch'

import { cloudUserSelectors } from '../../../store/slices/cloudUser'
import fetchUser from '../../../store/slices/cloudUser/thunks/fetch'
import cloudUserLogout from '../../../store/slices/cloudUser/thunks/logout'

import { getJwt, setJwt } from '../../../lib/auth/jwt'

import SSOLogin from './SSOLogin'

const meta = {
  title: 'Interaction/SSOLogin',
  component: SSOLogin,
  argTypes: {},
} satisfies Meta<typeof SSOLogin>

/**
 * Implements the same user auth login pattern as the apps.
 */
export const Default = () => {
  const dispatch = useAppDispatch()
  const loggedIn = useSelector(cloudUserSelectors.loggedIn)
  const [JWT, setJWT] = useState<string>()
  const [popupIsOpen, setPopupIsOpen] = useState(false)
  const localStorageJWT = getJwt()

  // Save the JWT in local storage
  useEffect(() => {
    if (!JWT) return
    setJwt(JWT)
    dispatch(fetchUser())
  }, [JWT])

  return (
    <>
      <SSOLogin
        appId="59068b7c-2c67-4d98-aef7-44d37914b86f"
        permissions="*"
        saveJWTInLocalStorage={false}
        onPopupOpened={() => setPopupIsOpen(true)}
        onSSOSuccess={(JWT) => setJWT(JWT)}
        onPopupClosed={() => setPopupIsOpen(false)}
        style={{ background: 'var(--bg-3)' }}
      />
      <p style={{ paddingTop: 20 }}><strong>JWT returned from SSO:</strong> {JWT ? JWT : 'Use button to test'}</p>
      <p style={{ paddingTop: 20 }}><strong>Is popup open?:</strong> {popupIsOpen ? 'Yes' : 'No'}</p>
      {/* Note: this is a shortcut for storybook... the apps persist the store, but storybook does not */}
      <p style={{ paddingTop: 20 }}><strong>Is logged into Storybook with Cardinal account?:</strong> {loggedIn ? 'Yes' : 'No'}</p>
      <p style={{ paddingTop: 20 }}><strong>Locally stored JWT:</strong> {localStorageJWT ? localStorageJWT : '(None)'}</p>
      <p style={{ paddingTop: 20 }}>
        <button type="button" style={{ marginRight: 10 }} onClick={() => dispatch(fetchUser())}>Login with locally stored cloud JWT</button>
        <button type="button" style={{ marginRight: 10 }} onClick={() => { if (loggedIn) dispatch(cloudUserLogout()) }}>Log out</button>
      </p>
    </>
  )
}

export default meta
