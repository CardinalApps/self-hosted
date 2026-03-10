import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { userSelectors } from '@cardinalapps/ui/src/store/slices/user'

/**
 * Checks the app state to ensure the user is logged in, and if not, redirects
 * to a safe page.
 *
 * Disabled in SSO flow.
 */
const useRedirectWhenLoggedIn = (redirect) => {
  const navigate = useNavigate()
  const loggedIn = useSelector(userSelectors.loggedIn)

  useEffect(() => {
    if (loggedIn) {
      navigate(redirect, { replace: true })
    }
  })
}

export default useRedirectWhenLoggedIn
