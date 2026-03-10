import { useMemo } from "react"
import { getMediaServerRole, hasCapability, MediaServerCapability } from "@cardinalapps/access-control/src"

import { useAppSelector } from "./useAppSelector"
import { homeServerUserSelectors } from "../store/slices/homeServerUser"

/**
 * Checks if the current user has a capability. The result is memoized.
 */
export function useHasCapability(capability: MediaServerCapability) {
  const currentUser = useAppSelector(homeServerUserSelectors.current)
  return useMemo(
    () => hasCapability<MediaServerCapability>(capability, currentUser?.roles?.flatMap((role) => getMediaServerRole(role.role).capabilities)),
    [capability, currentUser?.roles?.length, currentUser.userId],
  )
}

export default useHasCapability
