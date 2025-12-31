import { useState } from 'react'

import SSOLogin from '@cardinalapps/ui/src/components/interaction/SSOLogin'
import Loading from '@cardinalapps/ui/src/components/layout/Loading'

import homeServerLogin from '@cardinalapps/ui/src/store/slices/homeServerUser/thunks/login'

import * as routes from '../../routes'

import { CARDINAL_PUBLIC_APP_ID, CARDINAL_PUBLIC_APP_PERMISSIONS } from '../../env'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'

type LoginWithCardinalProps = {
  automaticallyLogin?: boolean,
  saveJWTInLocalStorage?: boolean,
  onSSOSuccess?: (JWT: string) => void,
}

export default function LoginWithCardinalOIDC({
  automaticallyLogin = true,
  saveJWTInLocalStorage = true,
  onSSOSuccess,
}: LoginWithCardinalProps) {
  const dispatch = useAppDispatch()
  const [loading, setLoading] = useState(false)

  /**
   * When the user logs into a Cardinal cloud account, try to log into the local
   * server owner account with the SSO token.
   */
  const handleSSOSuccess = (JWT: string) => {
    setLoading(true)
    if (automaticallyLogin) {
      dispatch(homeServerLogin({
        cardinalSSOToken: JWT,
        // If the login happens on any page other than the login page, we do not
        // need to automatically redirect off the login page
        redirectOutOfNextLoginPageVisit: window.location.href.includes(routes.LOGIN),
      }))
    }
  }

  return (
    <>
      {!loading &&
        <SSOLogin
          appId={CARDINAL_PUBLIC_APP_ID}
          permissions={CARDINAL_PUBLIC_APP_PERMISSIONS}
          saveJWTInLocalStorage={saveJWTInLocalStorage}
          onSSOSuccess={onSSOSuccess ? onSSOSuccess : handleSSOSuccess}
          isOIDC={true}
        />
      }
      {loading &&
        <Loading size="s" />
      }
    </>
  )
}
