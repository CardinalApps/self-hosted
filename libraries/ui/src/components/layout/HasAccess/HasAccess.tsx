import { PropsWithChildren, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { CapabilityString, getRole, hasCapability } from '@cardinalapps/access-control/src'

import AccessError from '../AccessError'

import { homeServerUserSelectors } from '../../../store/slices/homeServerUser'
import { RoleAssignmentEntity } from '../../../store/apis/roleAssignments'

type HasAccessProps = {
  capabilities: CapabilityString[],
}

/**
 * Checks if the current user is capable of doing the thing.
 */
const CurrentUserIsCapable = ({
  capabilities = [],
  children,
}: PropsWithChildren<HasAccessProps>) => {
  const currentUser = useSelector(homeServerUserSelectors.current)

  /**
   * The currently logged in user must have sufficient role assignments to
   * satisfy ALL required capabilities.
   */
  const checkAccess = (): boolean => {
    if (!capabilities.length) {
      return false
    }

    const allCapabilitiesAreSatisfied = capabilities.every((requiredCapability) => {
      const satisfiedByRole = currentUser?.roles?.find((assignment: RoleAssignmentEntity) => {
        return !!hasCapability(requiredCapability, getRole(assignment.role).capabilities)
      })
      return !!satisfiedByRole
    })

    return allCapabilitiesAreSatisfied
  }

  const hasAccess = useMemo(
    () => checkAccess(),
    [capabilities.length, currentUser.userId],
  )

  return hasAccess
    ? children
    : <AccessError code={403} capabilities={capabilities} />
}

export default CurrentUserIsCapable
