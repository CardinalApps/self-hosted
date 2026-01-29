import SSOLogin from '@cardinalapps/ui/src/components/interaction/SSOLogin'

import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'
import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import homeServerLogin from '@cardinalapps/ui/src/store/slices/homeServerUser/thunks/login'
import { useGetInstanceQuery } from '@cardinalapps/ui/src/store/apis/instance'

import * as routes from '../../routes'

import { CARDINAL_PUBLIC_APP_ID } from '../../env'

type LoginWithCardinalProps = {
  automaticallyLogin?: boolean,
  saveJWTInLocalStorage?: boolean,
  overrideServerName?: string,
  onSSOSuccess?: (JWT: string) => void,
}

export default function CardinalAdminSSOButton({
  automaticallyLogin = true,
  saveJWTInLocalStorage = true,
  overrideServerName,
  onSSOSuccess,
}: LoginWithCardinalProps) {
  const dispatch = useAppDispatch()
  const { enable_oidc_beta } = useAppSelector(settingsSelectors.current)

  const instanceQuery = useGetInstanceQuery()
  const { data: instanceData } = instanceQuery

  /**
   * When the user logs into a Cardinal cloud account, try to log into the local
   * server owner account with the SSO token.
   */
  const handleSSOSuccess = (JWT: string) => {
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
      <SSOLogin
        appId={CARDINAL_PUBLIC_APP_ID}
        instanceId={instanceData?.instanceId}
        serverName={overrideServerName || instanceData?.serverName}
        permissions={CARDINAL_PUBLIC_APP_PERMISSIONS}
        saveJWTInLocalStorage={saveJWTInLocalStorage}
        onSSOSuccess={onSSOSuccess ? onSSOSuccess : handleSSOSuccess}
        enableNewSSOFlow={enable_oidc_beta as boolean | undefined}
      />
    </>
  )
}
