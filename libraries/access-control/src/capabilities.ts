/**
 * A capability is a string that combines an aspect and an action, separating
 * them with a dot, like so:
 * 
 *    - `{Aspect}.{Action}`
 * 
 * Capability *Assignments* are either literal capabilities like above, or can
 * include wildcards for selecting broader ranges of capabilities.
 * 
 *    - `*.*` - Matches all aspects and all actions, granting all current and
 *      future capabilities.
 * 
 *    - `MusicApp.*` - Matches all actions in the MusicApp aspect, granting all
 *      current and future MusicApp capabilities.
 * 
 *    - `*.Login` - Matches only the Login action on all current and future
 *      aspects.
 * 
 *    - `CinemaApp.Login` - Matches only the Login action on the CinemaApp
 *      aspect.
 * 
 * Use the generic to scope the CapabilityAssignment to a specific RBAC context.
 */
export type CapabilityAssignment<T> =
  T
  | '*.*'
  | `${string}.*`
  | `*.${string}`

export type CapabilityAssignments<T> = CapabilityAssignment<T>[]

/**
 * Validate the syntax of an capability assignment. This will check:
 * 
 *    - That it's a string
 *    - That it has exactly 1 dot
 *    - That the left and right sides of the dot are not empty
 * 
 * This does *not* check that the capability exists in the master list.
 */
const validateCapabilitySyntax = <TCapabilityContext>(assignment: CapabilityAssignment<TCapabilityContext>): boolean => {
  if (typeof assignment !== 'string') {
    return false
  }

  if (!assignment.includes('.')) {
    return false
  }

  const parts = assignment.split('.')

  if (parts.length !== 2) {
    return false
  }

  const emptyParts = parts
    .find((part) => !part.length)

  if (emptyParts !== undefined) {
    return false
  }

  return true
}

/**
 * Validate the syntax of an array of capability assignments. All array items
 * must be valid.
 */
const validateCapabilitiesSyntax = <Caps>(capabilityList: CapabilityAssignments<Caps> = []): boolean => {
  let allAreValid = true

  for (const capability of capabilityList) {
    if (!validateCapabilitySyntax(capability)) {
      allAreValid = false
    }
  }

  return allAreValid
}

/**
 * Checks whether the required capability is satisfied by any of the given
 * capability assignments. Use the generic for autocomplete.
 */
export function hasCapability<Caps>(
  requiredCapability: Caps,
  assignments: CapabilityAssignments<Caps> = [],
) {
  if (typeof requiredCapability !== 'string') {
    return false
  }

  if (!validateCapabilitySyntax(requiredCapability)) {
    return false
  }

  if (!validateCapabilitiesSyntax(assignments)) {
    return false
  }

  if (!assignments.length) {
    return false
  }

  const [requiredAspect, requiredAction] = requiredCapability.split('.')

  for (const assignment of assignments) {
    if (typeof assignment !== 'string') {
      return false
    }

    const [assignmentAspect, assignmentAction] = assignment.split('.')
    let aspectIsValid = false
    let actionIsValid = false

    if (
      requiredAspect === assignmentAspect
      || assignmentAspect === '*'
    ) {
      aspectIsValid = true
    }

    if (
      requiredAction === assignmentAction
      || assignmentAction === '*'
    ) {
      actionIsValid = true
    }

    if (aspectIsValid && actionIsValid) {
      return true
    }
  }

  return false
}

/**
 * Like `hasCapability()` but for more than 1 capability. Returns true if ALL
 * capabilities are satisfied.
 */
export function hasCapabilities<Caps>(
  requiredCapabilities: Caps[],
  assignments: CapabilityAssignments<Caps> = [],
) {
  if (!requiredCapabilities) {
    return true
  }

  if (!Array.isArray(requiredCapabilities) || !requiredCapabilities.length) {
    return false
  }

  const allCapabilitiesAreSatisfied = requiredCapabilities.every((requiredCapability) => {
    const satisfiedByRole = assignments?.find((assignment: CapabilityAssignment<Caps>) => {
      return !!hasCapability<Caps>(requiredCapability, [assignment])
    })
    return !!satisfiedByRole
  })

  return allCapabilitiesAreSatisfied
}
