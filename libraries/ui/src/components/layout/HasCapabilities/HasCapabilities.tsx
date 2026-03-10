import { PropsWithChildren, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { MediaServerCapability, getMediaServerRole, hasCapabilities } from '@cardinalapps/access-control/src'

import AccessError from '../AccessError'

import { homeServerUserSelectors } from '../../../store/slices/homeServerUser'

type HasAccessProps = {
  capabilities: MediaServerCapability[],
}

/**
 * Checks if the current user is capable of doing the thing.
 * 
 * @param capabilities - An array of required capabilities.
 * 
 *    - `['Users.Read', 'AdminApp.Login']` - ALL capabilities must be satsfied
 *      by the current users roles to be granted access to the content.
 * 
 *    - `[]` - An empty array means that a capability check is required, but the
 *      check will fail for all users since at least 1 capability is required.
 * 
 *    - `undefined` - No capability check is required, and the user will be
 *      granted access.
 */
const HasCapabilities = ({
  capabilities,
  children,
}: PropsWithChildren<HasAccessProps>) => {
  const currentUser = useSelector(homeServerUserSelectors.current)

  const hasAccess = useMemo(
    () => hasCapabilities<MediaServerCapability>(capabilities, currentUser?.roles?.flatMap((role) => getMediaServerRole(role.role).capabilities)),
    [(capabilities || []).length, currentUser.userId],
  )

  return hasAccess
    ? children
    : <AccessError code={403} capabilities={capabilities} />
}

export default HasCapabilities
